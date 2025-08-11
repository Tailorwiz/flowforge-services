import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, MessageSquare, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Message {
  id: string;
  client_id: string;
  sender_id: string;
  sender_type: 'admin' | 'client';
  message: string;
  message_type: 'text' | 'file' | 'system';
  attachment_url?: string;
  attachment_name?: string;
  read_at?: string;
  created_at: string;
  updated_at: string;
  sender_name?: string;
}

interface MessagingCenterProps {
  clientId: string;
  clientName?: string;
  userRole: 'admin' | 'client';
  currentUserId: string;
}

export const MessagingCenter: React.FC<MessagingCenterProps> = ({
  clientId,
  clientName,
  userRole,
  currentUserId,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch messages
  const fetchMessages = async () => {
    try {
      setIsLoadingMessages(true);
      
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch sender profiles separately for each unique sender
      const senderIds = [...new Set(messagesData?.map(msg => msg.sender_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', senderIds);

      // Create a map of sender profiles
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Add sender names to messages
      const messagesWithNames = messagesData?.map(msg => {
        const profile = profileMap.get(msg.sender_id);
        return {
          ...msg,
          sender_name: profile 
            ? `${profile.first_name} ${profile.last_name}`.trim()
            : msg.sender_type === 'admin' ? 'Admin' : 'Client'
        };
      }) || [];

      setMessages(messagesWithNames as Message[]);
      
      // Mark messages as read if user is viewing
      if (messagesWithNames.length > 0) {
        const unreadMessages = messagesWithNames.filter(
          msg => !msg.read_at && msg.sender_id !== currentUserId
        );
        
        if (unreadMessages.length > 0) {
          await supabase
            .from('messages')
            .update({ read_at: new Date().toISOString() })
            .in('id', unreadMessages.map(msg => msg.id));
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('messages')
        .insert({
          client_id: clientId,
          sender_id: currentUserId,
          sender_type: userRole,
          message: newMessage.trim(),
          message_type: 'text',
        });

      if (error) throw error;

      setNewMessage('');
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully",
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    fetchMessages();
  }, [clientId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `client_id=eq.${clientId}`,
        },
        async (payload) => {
          // Fetch sender profile for the new message
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', payload.new.sender_id)
            .single();

          const newMessage = {
            ...payload.new,
            sender_name: profile 
              ? `${profile.first_name} ${profile.last_name}`.trim()
              : payload.new.sender_type === 'admin' ? 'Admin' : 'Client'
          } as Message;

          setMessages(prev => [...prev, newMessage]);

          // Mark as read if it's not from current user
          if (payload.new.sender_id !== currentUserId) {
            await supabase
              .from('messages')
              .update({ read_at: new Date().toISOString() })
              .eq('id', payload.new.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, currentUserId]);

  const formatMessageTime = (timestamp: string) => {
    return format(new Date(timestamp), 'MMM d, h:mm a');
  };

  const isOwnMessage = (message: Message) => {
    return message.sender_id === currentUserId;
  };

  return (
    <Card className="h-full flex flex-col max-h-[600px]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Messages {clientName && `with ${clientName}`}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Messages container */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {isLoadingMessages ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">Loading messages...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No messages yet</p>
                <p className="text-sm">Start a conversation!</p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${isOwnMessage(message) ? 'justify-end' : 'justify-start'} gap-2`}
              >
                {!isOwnMessage(message) && (
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarFallback className="text-xs">
                      {message.sender_type === 'admin' ? 'A' : 'C'}
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div className={`max-w-[70%] ${isOwnMessage(message) ? 'order-1' : ''}`}>
                  <div
                    className={`rounded-lg px-3 py-2 ${
                      isOwnMessage(message)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                  </div>
                  
                  <div className={`flex items-center gap-2 mt-1 ${isOwnMessage(message) ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-xs text-muted-foreground">
                      {message.sender_name}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatMessageTime(message.created_at)}
                    </span>
                    {message.read_at && isOwnMessage(message) && (
                      <Badge variant="secondary" className="text-xs py-0 px-1">
                        Read
                      </Badge>
                    )}
                  </div>
                </div>

                {isOwnMessage(message) && (
                  <Avatar className="h-8 w-8 mt-1 order-2">
                    <AvatarFallback className="text-xs">
                      {message.sender_type === 'admin' ? 'A' : 'C'}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message input */}
        <div className="flex gap-2 border-t pt-4">
          <Textarea
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 min-h-[40px] max-h-[120px] resize-none"
            disabled={loading}
          />
          <Button
            onClick={sendMessage}
            disabled={loading || !newMessage.trim()}
            size="sm"
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};