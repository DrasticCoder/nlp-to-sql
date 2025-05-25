import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface QueryResponse {
  success: boolean;
  message: string;
  sql?: string;
  data?: unknown;
  error?: string;
  milestones: string[];
  queries?: {
    original?: string;
    preprocessed?: string;
    intent?: string;
    generatedSQL?: string;
    validatedSQL?: string;
  };
}

const TODO_SCHEMA = `
Table: todos
Columns:
- id (integer, primary key, auto-increment)
- title (text, not null)
- completed (boolean, default false)
- created_at (timestamp, default now())

Sample data:
- Learn ShadCN components (completed: false)
- Build NLP-to-SQL app (completed: true)
`;

export async function POST(request: NextRequest) {
  const milestones: string[] = [];
  const queries: QueryResponse['queries'] = {};

  try {
    // Check for required environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database configuration missing',
          milestones: ['❌ Database not configured'],
          queries,
        },
        { status: 500 },
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI service configuration missing',
          milestones: ['❌ AI services not configured'],
          queries,
        },
        { status: 500 },
      );
    }

    const body = await request.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: 'Natural language query is required',
          milestones: ['❌ Validation failed - No query provided'],
          queries,
        },
        { status: 400 },
      );
    }

    queries.original = query;
    milestones.push('✅ Milestone 1: Query received and validated');
    milestones.push(`🔎 Query: "${query}"`);

    // Step 1: Preprocessing
    const cleanedQuery = preprocessQuery(query);
    queries.preprocessed = cleanedQuery;
    milestones.push('✅ Milestone 2: Query preprocessing completed');
    milestones.push(`🔎 Preprocessed Query: "${cleanedQuery}"`);

    // Step 2: Intent Classification
    const intent = classifyIntent(cleanedQuery);
    queries.intent = intent;
    milestones.push(`✅ Milestone 3: Intent classified as "${intent}"`);
    milestones.push(`🔎 Intent: "${intent}"`);

    // Step 3: SQL Generation using Groq
    milestones.push('🔄 Milestone 4: Generating SQL with Groq AI...');
    const sqlQuery = await generateSQLWithGroq(cleanedQuery, intent);
    queries.generatedSQL = sqlQuery;
    milestones.push('✅ Milestone 4: SQL generated successfully');
    milestones.push(`🔎 Generated SQL: "${sqlQuery}"`);

    // Step 4: Validation with Gemini
    milestones.push('🔄 Milestone 5: Validating SQL with Gemini...');
    const validation = await validateSQLWithGemini(query, sqlQuery);

    // Use the validated/corrected SQL if available, otherwise use original
    // If validation fails but provides a suggestion, use the suggestion
    let finalSQL = validation.suggestion || sqlQuery;

    // Apply our own SQL fixes as a fallback
    if (!validation.valid && !validation.suggestion) {
      finalSQL = fixSQLSyntax(sqlQuery, query);
      milestones.push(`🔧 Applied automatic SQL fixes`);
    }

    queries.validatedSQL = finalSQL;

    milestones.push(
      `✅ Milestone 5: SQL validation ${
        validation.valid ? 'passed' : 'failed'
      }`,
    );
    milestones.push(`🔎 Validated SQL: "${finalSQL}"`);

    // Only reject if validation fails AND no corrected suggestion is available
    if (!validation.valid && !validation.suggestion && finalSQL === sqlQuery) {
      return NextResponse.json(
        {
          success: false,
          error: `SQL validation failed: ${validation.reason}. Unable to auto-correct.`,
          sql: sqlQuery,
          suggestion: finalSQL,
          milestones,
          queries,
        },
        { status: 400 },
      );
    }

    // If we have a corrected SQL, proceed with execution
    milestones.push('🔄 Milestone 6: Parsing and executing SQL query...');
    const result = await executeSQLQuery(finalSQL, milestones);
    milestones.push('✅ Milestone 6: Query executed successfully');

    return NextResponse.json({
      success: true,
      message: `Successfully processed: "${query}"`,
      sql: finalSQL, // Return the final SQL that was actually executed
      data: result,
      milestones,
      queries,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    milestones.push(`❌ Error: ${errorMessage}`);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        milestones,
        queries,
      },
      { status: 500 },
    );
  }
}

function preprocessQuery(query: string): string {
  // Basic preprocessing: lowercase, trim, remove extra spaces
  return query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .trim();
}

function classifyIntent(query: string): string {
  const addKeywords = ['add', 'create', 'new', 'insert', 'make'];
  const deleteKeywords = ['delete', 'remove', 'drop'];
  const updateKeywords = [
    'update',
    'edit',
    'change',
    'modify',
    'mark',
    'complete',
    'finish',
    'done',
    'set',
  ];
  const listKeywords = ['list', 'show', 'get', 'find', 'select', 'display'];

  // More specific intent classification
  if (
    query.includes('show') ||
    query.includes('list') ||
    query.includes('display') ||
    query.includes('get')
  )
    return 'READ';
  if (
    query.includes('mark') &&
    (query.includes('done') || query.includes('complete'))
  )
    return 'UPDATE';
  if (
    query.includes('finish') ||
    (query.includes('set') && query.includes('done'))
  )
    return 'UPDATE';
  if (addKeywords.some((keyword) => query.includes(keyword))) return 'CREATE';
  if (deleteKeywords.some((keyword) => query.includes(keyword)))
    return 'DELETE';
  if (updateKeywords.some((keyword) => query.includes(keyword)))
    return 'UPDATE';
  if (listKeywords.some((keyword) => query.includes(keyword))) return 'READ';

  return 'READ'; // default
}

async function generateSQLWithGroq(
  query: string,
  intent: string,
): Promise<string> {
  const prompt = `
You are a SQL expert. Convert the following natural language query to a PostgreSQL query.

Database Schema:
${TODO_SCHEMA}

User Query: "${query}"
Intent: ${intent}

Rules:
1. Only generate SELECT, INSERT, UPDATE, or DELETE statements
2. Use proper PostgreSQL syntax with CORRECT QUOTING
3. ALL string values MUST be wrapped in single quotes
4. Be safe - no DROP, ALTER, or other dangerous operations
5. For updates, use WHERE clauses to target specific records
6. Return ONLY the SQL query with no explanations, no markdown, no additional text
7. ALWAYS quote string literals properly

Examples:
- For "add a task to buy milk": INSERT INTO todos (title, completed) VALUES ('buy milk', false);
- For "show all tasks": SELECT * FROM todos;
- For "mark first task complete": UPDATE todos SET completed = true WHERE id = (SELECT id FROM todos ORDER BY created_at LIMIT 1);
- For "create task to call John": INSERT INTO todos (title, completed) VALUES ('call John', false);

IMPORTANT: String values in INSERT/UPDATE statements MUST be wrapped in single quotes!

SQL Query:`;

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama3-8b-8192',
    temperature: 0.1,
    max_tokens: 150,
  });

  const sqlQuery = completion.choices[0]?.message?.content?.trim() || '';

  // Enhanced SQL extraction and validation
  let cleanedSQL = extractCleanSQL(sqlQuery);

  // Fix common SQL syntax issues
  cleanedSQL = fixSQLSyntax(cleanedSQL, query);

  return cleanedSQL;
}

function extractTaskDescription(query: string): string {
  // Remove common command words and extract the actual task
  const cleaned = query
    .toLowerCase()
    .replace(
      /^(create|add|new|make|insert)\s+(a\s+)?(task|todo|item)\s+(for\s+me\s+)?(to\s+)?/i,
      '',
    )
    .replace(/,$/, '')
    .trim();

  // Handle different patterns
  if (
    cleaned.startsWith('order ') ||
    cleaned.startsWith('buy ') ||
    cleaned.startsWith('call ')
  ) {
    // For action verbs, keep as is
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  } else if (cleaned.includes(' to ')) {
    // Extract after "to" if present
    const toIndex = cleaned.indexOf(' to ');
    const result = cleaned.substring(toIndex + 4);
    return result.charAt(0).toUpperCase() + result.slice(1);
  }

  // Capitalize first letter for better presentation
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function fixSQLSyntax(sql: string, originalQuery: string): string {
  let fixedSQL = sql;

  // Check if it's an INSERT statement with unquoted string values
  if (sql.toUpperCase().includes('INSERT INTO TODOS')) {
    // More comprehensive pattern to match VALUES clause with unquoted strings
    const valuesPatterns = [
      /VALUES\s*\(\s*([^'"][^,)]*[^'"\s][^,)]*),\s*(true|false|null|\d+)\s*\)/i,
      /VALUES\s*\(\s*([^'"][^,)]+),\s*(true|false|null|\d+)\s*\)/i,
    ];

    for (const pattern of valuesPatterns) {
      const match = sql.match(pattern);
      if (match) {
        // Extract the actual task description from the original query
        const taskDescription = extractTaskDescription(originalQuery);

        // Escape single quotes in the task description
        const escapedDescription = taskDescription.replace(/'/g, "''");

        // Replace with properly quoted version
        fixedSQL = sql.replace(
          pattern,
          `VALUES ('${escapedDescription}', ${match[2]})`,
        );
        break;
      }
    }
  }

  // Check for UPDATE statements with unquoted strings
  if (sql.toUpperCase().includes('UPDATE TODOS SET')) {
    // Pattern to match SET clause with unquoted strings
    const setPattern = /SET\s+(\w+)\s*=\s*([^'"][^,\s;]+)/i;
    const match = sql.match(setPattern);

    if (match && match[1].toLowerCase() === 'title') {
      const taskDescription = extractTaskDescription(originalQuery);
      const escapedDescription = taskDescription.replace(/'/g, "''");

      fixedSQL = sql.replace(
        setPattern,
        `SET ${match[1]} = '${escapedDescription}'`,
      );
    }
  }

  return fixedSQL;
}

async function validateSQLWithGemini(
  originalQuery: string,
  sqlQuery: string,
): Promise<{
  valid: boolean;
  reason?: string;
  suggestion?: string;
}> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
Analyze this SQL query for safety and correctness:

Original User Request: "${originalQuery}"
Generated SQL: "${sqlQuery}"
Database Schema: ${TODO_SCHEMA}

IMPORTANT: The table ONLY has these columns: id, title, completed, created_at
There is NO assignee column or any other columns!

Check:
1. Is the SQL safe (no DROP, ALTER, etc.)?
2. Does it match the user's intent?
3. Is the syntax correct for PostgreSQL?
4. Are column names valid (only id, title, completed, created_at)?
5. Are string literals properly quoted with single quotes?
6. Does the task title make sense given the user's request?

Rules for corrections:
- Use title LIKE '%keyword%' for searching content
- Use title = 'exact title' for exact matches
- Only use existing columns: id, title, completed, created_at
- Never use assignee or other non-existent columns

Respond with JSON only - no additional text:
{
  "valid": true/false,
  "reason": "explanation if invalid",
  "suggestion": "corrected SQL if needed (SQL only, no explanations, properly quoted)"
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Clean and validate the suggestion if it exists
      if (parsed.suggestion) {
        let suggestion = extractCleanSQL(parsed.suggestion);
        // Apply our own syntax fixes as backup
        suggestion = fixSQLSyntax(suggestion, originalQuery);
        parsed.suggestion = suggestion;
      }

      return parsed;
    }
  } catch (error) {
    console.error('Gemini validation error:', error);
  }

  // Enhanced fallback validation
  const dangerous = [
    'drop',
    'alter',
    'truncate',
    'delete from todos',
    'update todos set',
  ];

  const isDangerous = dangerous.some((keyword) =>
    sqlQuery.toLowerCase().includes(keyword.toLowerCase()),
  );

  // Check for basic SQL syntax issues
  const hasUnquotedStrings =
    /VALUES\s*\([^'"][^,)]+,\s*(true|false|\d+)\)/i.test(sqlQuery);

  if (hasUnquotedStrings) {
    return {
      valid: false,
      reason: 'String literals must be properly quoted with single quotes',
      suggestion: fixSQLSyntax(sqlQuery, originalQuery),
    };
  }

  return {
    valid: !isDangerous && sqlQuery.trim().length > 0,
    reason: isDangerous
      ? 'Query contains potentially dangerous operations'
      : undefined,
  };
}

function extractCleanSQL(rawText: string): string {
  // Remove markdown formatting
  const cleaned = rawText
    .replace(/```sql\n?/gi, '')
    .replace(/```\n?/g, '')
    .trim();

  // Look for SQL patterns and extract them
  const sqlPatterns = [
    // Match complete SQL statements
    /(SELECT|INSERT|UPDATE|DELETE)[\s\S]*?;?$/i,
    // Match SQL within quotes or after colons
    /(?:query|sql)["']?\s*:?\s*["']?(SELECT|INSERT|UPDATE|DELETE)[\s\S]*?["']?;?/i,
    // Match SQL after "Here is" or similar phrases
    /(?:here\s+is|query\s+is|sql\s+is)[\s\S]*?(SELECT|INSERT|UPDATE|DELETE)[\s\S]*?;?$/i,
  ];

  for (const pattern of sqlPatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      let sql = match[1] ? match[0] : match[0];

      // Clean up the extracted SQL - but preserve quotes that are part of SQL syntax
      sql = sql
        .replace(/^.*?(SELECT|INSERT|UPDATE|DELETE)/i, '$1') // Remove text before SQL
        .replace(/;+$/, '') // Remove trailing semicolons
        .trim();

      if (sql && /^(SELECT|INSERT|UPDATE|DELETE)/i.test(sql)) {
        return sql;
      }
    }
  }

  // If no pattern matches, try to find SQL keywords and extract from there
  const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
  for (const keyword of sqlKeywords) {
    const index = cleaned.toUpperCase().indexOf(keyword);
    if (index !== -1) {
      const extracted = cleaned.substring(index).replace(/;+$/, '').trim();
      if (extracted) {
        return extracted;
      }
    }
  }

  // Last resort: return the original text cleaned
  return cleaned.replace(/;+$/, '').trim();
}

async function executeSQLQuery(
  sqlQuery: string,
  milestones: string[],
): Promise<unknown> {
  // Clean and normalize the SQL query
  const cleanedSQL = extractCleanSQL(sqlQuery);

  // More robust query type detection
  const queryType = cleanedSQL
    .toLowerCase()
    .replace(/^\s*/, '') // Remove leading whitespace
    .split(/\s+/)[0]; // Get first word

  milestones.push(`🔎 Cleaned SQL: "${cleanedSQL}"`);
  milestones.push(`🔎 Detected query type: "${queryType}"`);

  const allowedTypes = ['select', 'insert', 'update', 'delete'];

  if (!allowedTypes.includes(queryType)) {
    throw new Error(
      `Unsupported query type: "${queryType}". Allowed types: ${allowedTypes.join(
        ', ',
      )}. Raw input: "${sqlQuery}"`,
    );
  }

  // Parse SQL and execute using TodoService-like functions
  try {
    let result;

    switch (queryType) {
      case 'insert':
        result = await handleInsertQuery(cleanedSQL, milestones);
        break;
      case 'select':
        result = await handleSelectQuery(cleanedSQL, milestones);
        break;
      case 'update':
        result = await handleUpdateQuery(cleanedSQL, milestones);
        break;
      case 'delete':
        result = await handleDeleteQuery(cleanedSQL, milestones);
        break;
      default:
        throw new Error(`Unsupported query type: ${queryType}`);
    }

    return result;
  } catch (dbError) {
    const errorMessage =
      dbError instanceof Error ? dbError.message : String(dbError);
    throw new Error(`Database execution error: ${errorMessage}`);
  }
}

async function handleInsertQuery(
  sql: string,
  milestones: string[],
): Promise<unknown> {
  // Parse INSERT statement: INSERT INTO todos (title, completed) VALUES ('title', false)
  const insertPattern =
    /INSERT INTO todos\s*\([^)]+\)\s*VALUES\s*\(\s*'([^']+)'\s*,\s*(true|false)\s*\)/i;
  const match = sql.match(insertPattern);

  if (!match) {
    throw new Error('Could not parse INSERT statement');
  }

  const title = match[1];
  const completed = match[2].toLowerCase() === 'true';

  milestones.push(`🔎 Parsed INSERT: title="${title}", completed=${completed}`);

  // Use Supabase to insert directly
  const { data, error } = await supabaseAdmin
    .from('todos')
    .insert([{ title, completed }])
    .select()
    .single();

  if (error) {
    throw new Error(`Insert failed: ${error.message}`);
  }

  milestones.push(`✅ Successfully created todo with ID: ${data.id}`);

  // Return all todos to show updated list
  return await getAllTodos(milestones);
}

async function handleSelectQuery(
  sql: string,
  milestones: string[],
): Promise<unknown> {
  milestones.push(`🔎 Executing SELECT query`);

  // Parse SELECT statement to handle WHERE clauses
  const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|$)/i);

  if (whereMatch) {
    const whereClause = whereMatch[1].trim();
    milestones.push(`🔎 Parsing WHERE clause: ${whereClause}`);

    let query = supabaseAdmin.from('todos').select('*');

    // Handle LIKE operations for title search
    const likeMatch = whereClause.match(/title\s+LIKE\s+'%([^%']+)%'/i);
    if (likeMatch) {
      const searchTerm = likeMatch[1];
      milestones.push(`🔎 Filtering todos containing: "${searchTerm}"`);
      query = query.ilike('title', `%${searchTerm}%`);
    }
    // Handle exact title match
    else if (whereClause.match(/title\s*=\s*'([^']+)'/i)) {
      const titleMatch = whereClause.match(/title\s*=\s*'([^']+)'/i);
      if (titleMatch) {
        const exactTitle = titleMatch[1];
        milestones.push(`🔎 Filtering todos with exact title: "${exactTitle}"`);
        query = query.eq('title', exactTitle);
      }
    }
    // Handle completed status
    else if (whereClause.match(/completed\s*=\s*(true|false)/i)) {
      const completedMatch = whereClause.match(/completed\s*=\s*(true|false)/i);
      if (completedMatch) {
        const completed = completedMatch[1].toLowerCase() === 'true';
        milestones.push(`🔎 Filtering todos by completed status: ${completed}`);
        query = query.eq('completed', completed);
      }
    }

    // Execute the filtered query
    const { data, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) {
      throw new Error(`Select failed: ${error.message}`);
    }

    milestones.push(`📋 Found ${data?.length || 0} matching todos`);

    return {
      todos: data,
      count: data?.length || 0,
      message: `Found ${data?.length || 0} matching todos`,
    };
  }

  // If no WHERE clause, return all todos
  return await getAllTodos(milestones);
}

async function handleUpdateQuery(
  sql: string,
  milestones: string[],
): Promise<unknown> {
  // Parse UPDATE statement: UPDATE todos SET completed = true WHERE ...
  // More robust pattern to handle quoted values properly
  const updatePattern =
    /UPDATE todos SET\s+(\w+)\s*=\s*'([^']+)'(?:\s+WHERE\s+(.+))?/i;
  let match = sql.match(updatePattern);

  // If first pattern doesn't match, try without quotes
  if (!match) {
    const updatePatternNoQuotes =
      /UPDATE todos SET\s+(\w+)\s*=\s*([^,\s]+)(?:\s+WHERE\s+(.+))?/i;
    match = sql.match(updatePatternNoQuotes);
  }

  if (!match) {
    throw new Error('Could not parse UPDATE statement');
  }

  const column = match[1];
  const rawValue = match[2];
  const whereClause = match[3];

  // Parse value with proper typing
  let value: string | boolean;
  if (rawValue === 'true' || rawValue === 'false') {
    value = rawValue === 'true';
  } else {
    value = rawValue; // Keep as string
  }

  milestones.push(
    `🔎 Parsed UPDATE: ${column}=${value}, WHERE: ${whereClause || 'none'}`,
  );

  if (!whereClause) {
    throw new Error('UPDATE without WHERE clause is not allowed for safety');
  }

  // Handle different WHERE clauses
  let query = supabaseAdmin.from('todos').update({ [column]: value });

  if (whereClause.includes('id =')) {
    // Handle ID-based update
    const idMatch = whereClause.match(/id\s*=\s*'?([^'\s]+)'?/);
    if (idMatch) {
      query = query.eq('id', idMatch[1]);
      milestones.push(`🔎 Updating todo with ID: ${idMatch[1]}`);
    }
  } else if (whereClause.includes('title =')) {
    // Handle exact title match
    const titleMatch = whereClause.match(/title\s*=\s*'([^']+)'/i);
    if (titleMatch) {
      const title = titleMatch[1];
      query = query.eq('title', title);
      milestones.push(`🔎 Updating todo with exact title: "${title}"`);
    }
  } else if (whereClause.includes('title LIKE')) {
    // Handle partial title match
    const likeMatch = whereClause.match(/title\s+LIKE\s+'%([^%']+)%'/i);
    if (likeMatch) {
      const searchTerm = likeMatch[1];
      query = query.ilike('title', `%${searchTerm}%`);
      milestones.push(`🔎 Updating todos containing: "${searchTerm}"`);
    }
  } else if (
    whereClause.includes('ORDER BY') &&
    whereClause.includes('LIMIT')
  ) {
    // Handle subquery like: WHERE id = (SELECT id FROM todos ORDER BY created_at LIMIT 1)
    const { data: firstTodo } = await supabaseAdmin
      .from('todos')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (firstTodo) {
      query = query.eq('id', firstTodo.id);
      milestones.push(`🔎 Updating first todo (ID: ${firstTodo.id})`);
    }
  } else {
    throw new Error(`Unsupported WHERE clause in UPDATE: ${whereClause}`);
  }

  const { data, error } = await query.select();

  if (error) {
    throw new Error(`Update failed: ${error.message}`);
  }

  milestones.push(`✅ Successfully updated ${data?.length || 0} todo(s)`);

  // Return all todos to show updated list
  return await getAllTodos(milestones);
}

async function handleDeleteQuery(
  sql: string,
  milestones: string[],
): Promise<unknown> {
  // Parse DELETE statement: DELETE FROM todos WHERE ...
  const deletePattern = /DELETE FROM todos(?:\s+WHERE\s+(.+))?/i;
  const match = sql.match(deletePattern);

  if (!match) {
    throw new Error('Could not parse DELETE statement');
  }

  const whereClause = match[1];

  if (!whereClause) {
    throw new Error('DELETE without WHERE clause is not allowed for safety');
  }

  milestones.push(`🔎 Parsed DELETE with WHERE: ${whereClause}`);

  let query = supabaseAdmin.from('todos').delete();

  // Parse different types of WHERE clauses
  if (whereClause.includes('id =')) {
    // Handle ID-based deletion
    const idMatch = whereClause.match(/id\s*=\s*'?([^'\s]+)'?/);
    if (idMatch) {
      query = query.eq('id', idMatch[1]);
      milestones.push(`🔎 Deleting todo with ID: ${idMatch[1]}`);
    }
  } else if (whereClause.includes('title =')) {
    // Handle title-based deletion
    const titleMatch = whereClause.match(/title\s*=\s*'([^']+)'/i);
    if (titleMatch) {
      const title = titleMatch[1];
      query = query.eq('title', title);
      milestones.push(`🔎 Deleting todo with title: "${title}"`);
    }
  } else if (whereClause.includes('title LIKE')) {
    // Handle partial title match deletion
    const likeMatch = whereClause.match(/title\s+LIKE\s+'%([^%']+)%'/i);
    if (likeMatch) {
      const searchTerm = likeMatch[1];
      query = query.ilike('title', `%${searchTerm}%`);
      milestones.push(`🔎 Deleting todos containing: "${searchTerm}"`);
    }
  } else {
    throw new Error('Unsupported WHERE clause in DELETE statement');
  }

  const { error } = await query;

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }

  milestones.push(`✅ Successfully deleted todo(s)`);

  // Return all remaining todos to show updated list
  return await getAllTodos(milestones);
}

async function getAllTodos(milestones: string[]): Promise<{
  todos: unknown[];
  count: number;
  message: string;
}> {
  const { data, error } = await supabaseAdmin
    .from('todos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch todos: ${error.message}`);
  }

  milestones.push(`📋 Returning ${data?.length || 0} todos`);

  return {
    todos: data,
    count: data?.length || 0,
    message: 'Operation completed successfully',
  };
}
