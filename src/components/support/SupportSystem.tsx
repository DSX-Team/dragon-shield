import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  MessageCircle, 
  Phone, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Send,
  Paperclip,
  Search,
  Filter,
  MoreVertical,
  Headphones,
  Video,
  FileText,
  Zap
} from "lucide-react";
import { toast } from "sonner";

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: "open" | "in-progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  category: "technical" | "billing" | "general" | "streaming";
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  customer: {
    name: string;
    email: string;
    avatar?: string;
  };
  messages: ChatMessage[];
}

interface ChatMessage {
  id: string;
  content: string;
  sender: "customer" | "support";
  timestamp: string;
  attachments?: string[];
}

const SupportSystem = () => {
  const [activeTab, setActiveTab] = useState("chat");
  const [tickets, setTickets] = useState<SupportTicket[]>([
    {
      id: "T-001",
      subject: "Streaming issues with Channel 5",
      description: "Unable to watch Channel 5, keeps buffering",
      status: "open",
      priority: "high",
      category: "streaming",
      createdAt: "2024-01-22T10:30:00Z",
      updatedAt: "2024-01-22T10:30:00Z",
      customer: {
        name: "John Smith",
        email: "john@example.com",
        avatar: "/api/placeholder/32/32"
      },
      messages: [
        {
          id: "M-001",
          content: "Hi, I'm having trouble with Channel 5. It keeps buffering every few seconds.",
          sender: "customer",
          timestamp: "2024-01-22T10:30:00Z"
        }
      ]
    },
    {
      id: "T-002",
      subject: "Billing inquiry - subscription renewal",
      description: "Question about automatic renewal",
      status: "in-progress",
      priority: "medium",
      category: "billing",
      createdAt: "2024-01-22T09:15:00Z",
      updatedAt: "2024-01-22T11:20:00Z",
      assignedTo: "Sarah Johnson",
      customer: {
        name: "Mike Davis",
        email: "mike@example.com"
      },
      messages: [
        {
          id: "M-002",
          content: "When will my subscription automatically renew?",
          sender: "customer",
          timestamp: "2024-01-22T09:15:00Z"
        },
        {
          id: "M-003",
          content: "Hi Mike! Your subscription will renew automatically on February 1st. You'll receive an email confirmation 3 days before.",
          sender: "support",
          timestamp: "2024-01-22T11:20:00Z"
        }
      ]
    }
  ]);

  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(tickets[0]);
  const [newMessage, setNewMessage] = useState("");
  const [isChatOnline, setIsChatOnline] = useState(true);
  const [phoneAvailable, setPhoneAvailable] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedTicket?.messages]);

  const getStatusBadge = (status: SupportTicket["status"]) => {
    switch (status) {
      case "open":
        return <Badge className="bg-destructive text-destructive-foreground">Open</Badge>;
      case "in-progress":
        return <Badge className="bg-warning text-warning-foreground">In Progress</Badge>;
      case "resolved":
        return <Badge className="bg-success text-success-foreground">Resolved</Badge>;
      case "closed":
        return <Badge variant="secondary">Closed</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getPriorityBadge = (priority: SupportTicket["priority"]) => {
    switch (priority) {
      case "urgent":
        return <Badge variant="destructive">Urgent</Badge>;
      case "high":
        return <Badge className="bg-warning text-warning-foreground">High</Badge>;
      case "medium":
        return <Badge className="bg-primary text-primary-foreground">Medium</Badge>;
      case "low":
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedTicket) return;

    const message: ChatMessage = {
      id: `M-${Date.now()}`,
      content: newMessage,
      sender: "support",
      timestamp: new Date().toISOString()
    };

    setTickets(tickets.map(ticket => {
      if (ticket.id === selectedTicket.id) {
        return {
          ...ticket,
          messages: [...ticket.messages, message],
          updatedAt: new Date().toISOString()
        };
      }
      return ticket;
    }));

    setSelectedTicket({
      ...selectedTicket,
      messages: [...selectedTicket.messages, message]
    });

    setNewMessage("");
    toast.success("Message sent successfully");
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Support System</h2>
          <p className="text-muted-foreground">
            Comprehensive customer support with ~5 minute response time
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-success text-success-foreground">
            <CheckCircle className="mr-1 h-3 w-3" />
            Chat Online
          </Badge>
          <Badge variant="outline" className="bg-primary text-primary-foreground">
            <Phone className="mr-1 h-3 w-3" />
            Phone Available
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="chat">
            <MessageCircle className="mr-2 h-4 w-4" />
            Live Chat
          </TabsTrigger>
          <TabsTrigger value="phone">
            <Phone className="mr-2 h-4 w-4" />
            Phone Support
          </TabsTrigger>
          <TabsTrigger value="tickets">
            <FileText className="mr-2 h-4 w-4" />
            Tickets
          </TabsTrigger>
          <TabsTrigger value="knowledge">
            <Headphones className="mr-2 h-4 w-4" />
            Knowledge Base
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Ticket List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Active Conversations</h3>
                <Badge variant="outline">
                  {tickets.filter(t => t.status !== "closed").length} Active
                </Badge>
              </div>
              
              <div className="space-y-2">
                {tickets.map((ticket) => (
                  <Card 
                    key={ticket.id}
                    className={`cursor-pointer transition-colors ${
                      selectedTicket?.id === ticket.id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={ticket.customer.avatar} />
                            <AvatarFallback className="text-xs">
                              {ticket.customer.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{ticket.customer.name}</span>
                        </div>
                        {getStatusBadge(ticket.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2 truncate">
                        {ticket.subject}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatTimestamp(ticket.updatedAt)}</span>
                        {getPriorityBadge(ticket.priority)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Chat Interface */}
            <div className="lg:col-span-2">
              {selectedTicket ? (
                <Card className="h-[600px] flex flex-col">
                  <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={selectedTicket.customer.avatar} />
                          <AvatarFallback>
                            {selectedTicket.customer.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{selectedTicket.customer.name}</CardTitle>
                          <CardDescription>{selectedTicket.subject}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(selectedTicket.status)}
                        {getPriorityBadge(selectedTicket.priority)}
                      </div>
                    </div>
                  </CardHeader>

                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {selectedTicket.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.sender === "support" ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              message.sender === "support"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {formatTimestamp(message.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  <div className="border-t p-4">
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                        className="flex-1"
                      />
                      <Button size="icon" variant="outline">
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <Button onClick={sendMessage}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="h-[600px] flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Conversation Selected</h3>
                    <p className="text-muted-foreground">
                      Select a conversation from the list to start chatting.
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="phone" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Phone className="mr-2 h-5 w-5" />
                  Phone Support
                </CardTitle>
                <CardDescription>Direct phone support with technical specialists</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center space-y-2">
                  <div className="text-2xl font-bold text-primary">+1 (555) 123-IPTV</div>
                  <div className="text-sm text-muted-foreground">Technical Support Hotline</div>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Current Wait Time</span>
                    <Badge className="bg-success text-success-foreground">
                      <Clock className="mr-1 h-3 w-3" />
                      ~ 3 minutes
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Support Hours</span>
                    <span className="text-sm text-muted-foreground">24/7</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Languages</span>
                    <span className="text-sm text-muted-foreground">EN, ES, FR</span>
                  </div>
                </div>

                <Button className="w-full">
                  <Phone className="mr-2 h-4 w-4" />
                  Call Now
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Video className="mr-2 h-5 w-5" />
                  Video Support
                </CardTitle>
                <CardDescription>Screen sharing and video calls for complex issues</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center space-y-2">
                  <Zap className="h-8 w-8 text-primary mx-auto" />
                  <div className="text-sm font-medium">Remote Assistance Available</div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Screen Sharing</span>
                    <CheckCircle className="h-4 w-4 text-success" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Video Calls</span>
                    <CheckCircle className="h-4 w-4 text-success" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">File Transfer</span>
                    <CheckCircle className="h-4 w-4 text-success" />
                  </div>
                </div>

                <Button className="w-full" variant="outline">
                  <Video className="mr-2 h-4 w-4" />
                  Request Video Call
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Support Tickets</CardTitle>
              <CardDescription>Manage and track support requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Advanced Ticketing System</h3>
                <p className="text-muted-foreground mb-4">
                  Full ticketing system with priority management and SLA tracking.
                </p>
                <Button variant="outline">
                  <Clock className="mr-2 h-4 w-4" />
                  Coming Soon
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Knowledge Base</CardTitle>
              <CardDescription>Self-service documentation and tutorials</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Headphones className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Knowledge Base & Tutorials</h3>
                <p className="text-muted-foreground mb-4">
                  Comprehensive documentation, video tutorials, and FAQ section.
                </p>
                <Button variant="outline">
                  <Clock className="mr-2 h-4 w-4" />
                  Coming Soon
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SupportSystem;