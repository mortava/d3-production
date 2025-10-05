/**
 * React hook for Gemini WebSocket connection via Cloudflare AI Gateway
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
	GeminiWebSocketService,
	getGeminiWebSocket,
	destroyGeminiWebSocket,
} from '../services/gemini-websocket';

interface UseGeminiWebSocketOptions {
	accountId?: string;
	gatewayName?: string;
	apiKey?: string;
	authToken?: string;
	model?: string;
	autoConnect?: boolean;
}

interface UseGeminiWebSocketReturn {
	isConnected: boolean;
	sendMessage: (text: string) => void;
	messages: unknown[];
	connect: () => Promise<void>;
	disconnect: () => void;
	error: Error | null;
}

export function useGeminiWebSocket(
	options: UseGeminiWebSocketOptions = {}
): UseGeminiWebSocketReturn {
	const { autoConnect = true, ...config } = options;

	const [isConnected, setIsConnected] = useState(false);
	const [messages, setMessages] = useState<unknown[]>([]);
	const [error, setError] = useState<Error | null>(null);

	const wsRef = useRef<GeminiWebSocketService | null>(null);

	const handleMessage = useCallback((data: unknown) => {
		setMessages((prev) => [...prev, data]);
	}, []);

	const connect = useCallback(async () => {
		try {
			if (!wsRef.current) {
				wsRef.current = getGeminiWebSocket(config);
			}

			await wsRef.current.connect();
			setIsConnected(true);
			setError(null);

			// Set up message listener
			wsRef.current.onMessage(handleMessage);
		} catch (err) {
			const error = err instanceof Error ? err : new Error('Connection failed');
			setError(error);
			setIsConnected(false);
			console.error('Failed to connect:', error);
		}
	}, [config, handleMessage]);

	const disconnect = useCallback(() => {
		if (wsRef.current) {
			wsRef.current.offMessage(handleMessage);
			wsRef.current.disconnect();
			setIsConnected(false);
		}
	}, [handleMessage]);

	const sendMessage = useCallback((text: string) => {
		if (wsRef.current && wsRef.current.isConnected()) {
			wsRef.current.sendUserMessage(text);
		} else {
			console.error('Cannot send message: WebSocket not connected');
		}
	}, []);

	useEffect(() => {
		if (autoConnect) {
			connect();
		}

		return () => {
			disconnect();
		};
	}, [autoConnect, connect, disconnect]);

	useEffect(() => {
		return () => {
			destroyGeminiWebSocket();
		};
	}, []);

	return {
		isConnected,
		sendMessage,
		messages,
		connect,
		disconnect,
		error,
	};
}
