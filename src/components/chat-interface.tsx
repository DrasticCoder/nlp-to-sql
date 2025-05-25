'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Lightbulb,
  Search,
  Plus,
  Edit,
  Trash2,
} from 'lucide-react';

interface Message {
  id: string;
  text: string;
  type: 'user' | 'system' | 'processing';
  timestamp: Date;
  sql?: string;
  data?: string | Record<string, unknown>;
  milestones?: string[];
  success?: boolean;
  queries?: {
    original?: string;
    preprocessed?: string;
    intent?: string;
    generatedSQL?: string;
    validatedSQL?: string;
  };
}

interface ChatInterfaceProps {
  onCommand: (command: string) => void;
  onDataUpdate?: (data: unknown) => void;
}

const SUGGESTION_TABS = [
  {
    id: 'create',
    label: 'Create',
    icon: Plus,
    color: 'bg-green-100 text-green-700 border-green-200',
    suggestions: [
      'Add a new task to buy groceries',
      'Create a task to call my dentist',
      'Make a task to prepare presentation',
      'Add task to water the plants',
      'Create new task to read a book',
    ],
  },
  {
    id: 'search',
    label: 'Search',
    icon: Search,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    suggestions: [
      'Show all my tasks',
      'Show completed tasks',
      'Find tasks related to work',
      'Show tasks containing meeting',
      'List all pending tasks',
    ],
  },
  {
    id: 'update',
    label: 'Update',
    icon: Edit,
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    suggestions: [
      'Mark groceries task as done',
      'Complete the first task',
      'Set presentation task as finished',
      'Update meeting task to call client',
      'Change water plants to feed cat',
    ],
  },
  {
    id: 'delete',
    label: 'Delete',
    icon: Trash2,
    color: 'bg-red-100 text-red-700 border-red-200',
    suggestions: [
      'Delete the groceries task',
      'Remove completed tasks',
      'Delete task about dentist',
      'Remove all tasks with meeting',
      'Delete the first task',
    ],
  },
];

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onCommand,
  onDataUpdate,
}) => {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('create');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSuggestionClick = async (suggestion: string) => {
    setInputText(suggestion);
    setShowSuggestions(false);
    // Auto-submit the suggestion
    await sendMessage(suggestion);
  };

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputText;
    if (!textToSend.trim() || isLoading) return;

    setIsLoading(true);
    setShowSuggestions(false);

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: textToSend,
      type: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');

    // Add processing message
    const processingMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: '🔄 Processing your request...',
      type: 'processing',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, processingMessage]);

    try {
      // Call the NLP-to-SQL API
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: textToSend }),
      });

      const result = await response.json();

      // Remove processing message and add result
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== processingMessage.id),
      );

      const systemResponse: Message = {
        id: (Date.now() + 2).toString(),
        text: result.success ? `✅ ${result.message}` : `❌ ${result.error}`,
        type: 'system',
        timestamp: new Date(),
        sql: result.sql,
        data: result.data,
        milestones: result.milestones,
        success: result.success,
        ...(result.queries && { queries: result.queries }),
      };

      setMessages((prev) => [...prev, systemResponse]);

      // Trigger data update callback if successful
      if (result.success && result.data && onDataUpdate) {
        onDataUpdate(result.data);
      }

      // Trigger command callback for successful operations
      if (result.success) {
        onCommand(textToSend);
      }
    } catch (error) {
      // Remove processing message and add error
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== processingMessage.id),
      );

      const errorMessage: Message = {
        id: (Date.now() + 3).toString(),
        text: `❌ Error: ${
          error instanceof Error ? error.message : 'Something went wrong'
        }`,
        type: 'system',
        timestamp: new Date(),
        success: false,
      };

      setMessages((prev) => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  const renderMilestones = (milestones: string[]) => {
    return (
      <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
        <div className="text-blue-600 mb-1 font-semibold">
          Processing Steps:
        </div>
        {milestones.map((milestone, index) => (
          <div key={index} className="flex items-center gap-1 text-blue-800">
            {milestone.startsWith('✅') && (
              <CheckCircle className="h-3 w-3 text-green-500" />
            )}
            {milestone.startsWith('❌') && (
              <XCircle className="h-3 w-3 text-red-500" />
            )}
            {milestone.startsWith('🔄') && (
              <Clock className="h-3 w-3 text-yellow-500" />
            )}
            <span>{milestone}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderQueryDetails = (queries: Message['queries']) => {
    if (!queries) return null;

    return (
      <div className="mt-3 p-2 bg-purple-50 rounded text-xs">
        <div className="text-purple-600 mb-1 font-semibold">
          Query Pipeline:
        </div>
        {queries.original && (
          <div>
            <strong>Original:</strong>&quot;{queries.original}&quot;
          </div>
        )}
        {queries.preprocessed && (
          <div>
            <strong>Preprocessed:</strong>&quot;{queries.preprocessed}&quot;
          </div>
        )}
        {queries.intent && (
          <div>
            <strong>Intent:</strong>
            {queries.intent}
          </div>
        )}
        {queries.generatedSQL && (
          <div>
            <strong>Generated SQL:</strong>
            <pre className="text-purple-800 mt-1">{queries.generatedSQL}</pre>
          </div>
        )}
        {queries.validatedSQL && (
          <div>
            <strong>Validated SQL:</strong>
            <pre className="text-purple-800 mt-1">{queries.validatedSQL}</pre>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-2">
          Natural Language Interface
        </h2>
        {showSuggestions && messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Hello! I can help you manage your todos with natural language.
              Choose a category below or type your own command.
            </p>

            {/* Suggestion Tabs */}
            <div className="flex gap-2 mb-3">
              {SUGGESTION_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1 px-3 py-1 text-xs rounded-md border transition-colors ${
                      activeTab === tab.id
                        ? tab.color
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Suggestions */}
            <div className="grid gap-2">
              {SUGGESTION_TABS.find(
                (tab) => tab.id === activeTab,
              )?.suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="text-left p-2 text-sm rounded border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-3 w-3 text-gray-400" />
                    {suggestion}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-96">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.type === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[90%] p-3 rounded-lg ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white'
                  : message.type === 'processing'
                  ? 'bg-yellow-100 text-yellow-900 border border-yellow-300'
                  : message.success === false
                  ? 'bg-red-100 text-red-900 border border-red-300'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm">{message.text}</p>

              {message.milestones && renderMilestones(message.milestones)}

              {message.queries && renderQueryDetails(message.queries)}

              {message.sql && (
                <div className="mt-3 p-2 bg-gray-800 rounded text-green-400 text-xs font-mono">
                  <div className="text-gray-400 mb-1 font-sans">Final SQL:</div>
                  {message.sql}
                </div>
              )}

              {message.data && (
                <>
                  <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
                    <div className="text-blue-600 mb-1 font-semibold">
                      Query Result:
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                      <pre className="text-blue-800 overflow-x-auto text-xs">
                        {typeof message.data === 'string'
                          ? message.data
                          : JSON.stringify(message.data, null, 2)}
                      </pre>
                    </div>
                  </div>
                </>
              )}

              <p className="text-xs opacity-70 mt-2">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your natural language command..."
            disabled={isLoading}
            className="flex-1"
            onFocus={() => setShowSuggestions(false)}
          />
          <Button
            onClick={() => sendMessage()}
            disabled={isLoading || !inputText.trim()}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {messages.length > 0 && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                setMessages([]);
                setShowSuggestions(true);
                setInputText('');
              }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear Chat
            </button>
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              {showSuggestions ? 'Hide' : 'Show'} Suggestions
            </button>
          </div>
        )}
      </div>
    </Card>
  );
};
