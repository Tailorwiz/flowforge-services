import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { MessageSquare, Send } from "lucide-react";
import { format } from "date-fns";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  is_admin: boolean;
  user_id: string;
}

interface DeliveryCommentsProps {
  deliveryId: string;
  clientId: string;
}

export function DeliveryComments({ deliveryId, clientId }: DeliveryCommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [deliveryId]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_comments')
        .select('*')
        .eq('delivery_id', deliveryId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('delivery_comments')
        .insert({
          delivery_id: deliveryId,
          client_id: clientId,
          user_id: user?.id,
          content: newComment.trim(),
          is_admin: false
        });

      if (error) throw error;

      setNewComment("");
      fetchComments();
      
      toast({
        title: "Comment posted",
        description: "Your comment has been added to this delivery.",
      });
    } catch (error) {
      console.error('Error posting comment:', error);
      toast({
        title: "Error",
        description: "Failed to post comment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <span className="text-sm font-medium">Comments</span>
        </div>
        <div className="animate-pulse bg-muted h-20 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <span className="text-sm font-medium">
            Comments {comments.length > 0 && `(${comments.length})`}
          </span>
        </div>
        {comments.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Hide" : "Show"}
          </Button>
        )}
      </div>

      {expanded && comments.length > 0 && (
        <div className="space-y-3">
          {comments.map((comment) => (
            <Card key={comment.id} className="bg-muted/30">
              <CardContent className="p-3">
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={comment.is_admin ? "bg-primary text-primary-foreground" : ""}>
                      {comment.is_admin ? "RDR" : "You"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {comment.is_admin ? "RDR Team" : "You"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comment.created_at), 'MMM dd, yyyy at h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Comment Form */}
      <div className="space-y-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment or question about this delivery..."
          rows={2}
        />
        <div className="flex justify-end">
          <Button
            onClick={handleSubmitComment}
            disabled={!newComment.trim() || submitting}
            size="sm"
          >
            <Send className="h-4 w-4 mr-2" />
            {submitting ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      </div>
    </div>
  );
}