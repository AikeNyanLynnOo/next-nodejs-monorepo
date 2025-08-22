"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export interface QuoteTick {
  symbol: string;
  price: number;
  ts: string;
}

interface QuoteRowProps {
  symbol: string;
  quote: QuoteTick | null;
  previousQuote: QuoteTick | null;
}

// Memoized row component to avoid unnecessary re-renders
const QuoteRow = React.memo<QuoteRowProps>(
  ({ symbol, quote, previousQuote }) => {
    const priceChange =
      quote && previousQuote ? quote.price - previousQuote.price : 0;
    const priceChangePercent =
      quote && previousQuote ? (priceChange / previousQuote.price) * 100 : 0;

    const getChangeIcon = () => {
      if (Math.abs(priceChange) < 0.01)
        return <Minus className="w-4 h-4 text-gray-400" />;
      return priceChange > 0 ? (
        <TrendingUp className="w-4 h-4 text-green-500" />
      ) : (
        <TrendingDown className="w-4 h-4 text-red-500" />
      );
    };

    const getChangeColor = () => {
      if (Math.abs(priceChange) < 0.01) return "text-gray-500";
      return priceChange > 0 ? "text-green-600" : "text-red-600";
    };

    return (
      <div className="flex items-center justify-between py-2 px-4 border-b border-gray-100 hover:bg-gray-50">
        <div className="flex items-center gap-3">
          {getChangeIcon()}
          <span className="font-medium text-gray-900">{symbol}</span>
        </div>
        <div className="text-right">
          <div className="font-mono text-lg">
            {quote ? `$${quote.price.toFixed(2)}` : "—"}
          </div>
          {Math.abs(priceChange) >= 0.01 && (
            <div className={`text-sm ${getChangeColor()}`}>
              {priceChange > 0 ? "+" : ""}
              {priceChange.toFixed(2)} ({priceChangePercent > 0 ? "+" : ""}
              {priceChangePercent.toFixed(2)}%)
            </div>
          )}
        </div>
      </div>
    );
  }
);

QuoteRow.displayName = "QuoteRow";

interface QuotesDashboardProps {
  symbols?: string[];
  wsUrl?: string;
}

export function QuotesDashboard({
  symbols = ["AAPL", "MSFT", "GOOG", "AMZN", "META"],
  wsUrl = process.env.NEXT_PUBLIC_WS_URL
    ? `${process.env.NEXT_PUBLIC_WS_URL}/quotes`
    : "ws://localhost:3001/ws/quotes",
}: QuotesDashboardProps) {
  // State
  const [quotes, setQuotes] = useState<Record<string, QuoteTick>>({});
  const [previousQuotes, setPreviousQuotes] = useState<
    Record<string, QuoteTick>
  >({});
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Refs for batching
  const pendingUpdates = useRef<Record<string, QuoteTick>>({});
  const animationFrameId = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Reconnection with exponential backoff
  const reconnect = useCallback(() => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      setConnectionError("Max reconnection attempts reached");
      return;
    }

    const backoffMs = Math.min(
      1000 * Math.pow(2, reconnectAttempts.current),
      30000
    );
    const jitter = Math.random() * 1000; // Add up to 1s jitter

    reconnectTimeoutRef.current = setTimeout(() => {
      console.log(`Reconnecting... attempt ${reconnectAttempts.current + 1}`);
      connectWebSocket();
      reconnectAttempts.current++;
    }, backoffMs + jitter);
  }, []);

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    try {
      console.log("Attempting to connect to WebSocket:", wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;

        // Subscribe to symbols
        ws.send(JSON.stringify({ type: "subscribe", symbols }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "quotes" && data.items) {
            // Batch updates instead of immediate state update
            data.items.forEach((tick: QuoteTick) => {
              pendingUpdates.current[tick.symbol] = tick;
            });

            // Schedule state update on next animation frame
            if (!animationFrameId.current) {
              animationFrameId.current = requestAnimationFrame(() => {
                setQuotes((prev) => {
                  const newQuotes = { ...prev };
                  Object.assign(newQuotes, pendingUpdates.current);
                  return newQuotes;
                });
                setPreviousQuotes((prev) => {
                  const newPrevious = { ...prev };
                  // Store current quotes as previous before updating
                  Object.keys(pendingUpdates.current).forEach(symbol => {
                    if (quotes[symbol]) {
                      newPrevious[symbol] = quotes[symbol];
                    }
                  });
                  return newPrevious;
                });
                setLastUpdate(new Date());
                pendingUpdates.current = {};
                animationFrameId.current = null;
              });
            }
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      ws.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        if (animationFrameId.current) {
          cancelAnimationFrame(animationFrameId.current);
          animationFrameId.current = null;
        }

        if (!event.wasClean) {
          reconnect();
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setConnectionError("Connection error");
      };
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      console.error("WebSocket URL:", wsUrl);
      setConnectionError(`Failed to connect to ${wsUrl}`);
    }
  }, [wsUrl, symbols, reconnect]);

  // Initialize connection
  useEffect(() => {
    // Small delay to ensure backend is fully ready
    const timer = setTimeout(() => {
      connectWebSocket();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [connectWebSocket]);

  // Memoized sorted quotes for rendering
  const sortedQuotes = useMemo(() => {
    return symbols.map((symbol) => ({
      symbol,
      quote: quotes[symbol] || null,
      previousQuote: previousQuotes[symbol] || null,
    }));
  }, [symbols, quotes, previousQuotes]);

  // Chart.js chart component
  const SimpleChart = useMemo(() => {
    const chartData = sortedQuotes.slice(0, 5); // Show first 5 symbols
    const validQuotes = chartData.filter(d => d.quote && d.quote.price > 0);
    
    if (validQuotes.length === 0) {
      return (
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Price Chart (Top 5)</h3>
          <div className="h-32 flex items-center justify-center text-gray-500">
            Waiting for quote data...
          </div>
        </div>
      );
    }

    const labels = validQuotes.map(d => d.symbol);
    const prices = validQuotes.map(d => d.quote!.price);
    
    const chartConfig = {
      labels,
      datasets: [
        {
          label: 'Price ($)',
          data: prices,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: function(context: any) {
              return `${context.label}: $${context.parsed.y.toFixed(2)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          ticks: {
            callback: function(value: any) {
              return '$' + value.toFixed(0);
            }
          }
        },
        x: {
          ticks: {
            maxRotation: 0
          }
        }
      },
      animation: {
        duration: 300
      }
    };

    return (
      <div className="bg-white p-4 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Price Chart (Top 5)</h3>
        <div className="h-64">
          <Bar data={chartConfig} options={options} />
        </div>
      </div>
    );
  }, [sortedQuotes]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Real-time Quotes
        </h2>
        <div className="flex items-center gap-4">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="text-sm text-gray-600">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
          {lastUpdate && (
            <span className="text-xs text-gray-500">
              Last: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {connectionError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          {connectionError}
        </div>
      )}

      {/* Chart */}
      <div className="mb-6">{SimpleChart}</div>

      {/* Quotes Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">Live Quotes</h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {sortedQuotes.map(({ symbol, quote, previousQuote }) => (
            <QuoteRow
              key={symbol}
              symbol={symbol}
              quote={quote}
              previousQuote={previousQuote}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
