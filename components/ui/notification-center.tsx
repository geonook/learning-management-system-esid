"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/supabase/auth-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover"
import { 
  Bell, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  CheckCircle2,
  Clock,
  GraduationCap,
  FileText,
  Users,
  Settings
} from "lucide-react"
import {
  getUserNotifications,
  getNotificationSummary,
  markNotificationAsRead,
  type Notification,
  type NotificationType,
  type NotificationPriority
} from "@/lib/api/notifications"

// Icon mapping for notification types
const notificationIcons: Record<NotificationType, React.ElementType> = {
  exam_overdue: AlertTriangle,
  low_completion: AlertCircle,
  attendance_low: Users,
  grade_alert: GraduationCap,
  system_update: Settings,
  assignment_due: Clock,
  data_sync: FileText,
  permission_change: Settings
}

// Color mapping for priorities
const priorityColors: Record<NotificationPriority, string> = {
  urgent: "text-red-600 bg-red-50 border-red-200",
  high: "text-orange-600 bg-orange-50 border-orange-200",
  medium: "text-blue-600 bg-blue-50 border-blue-200",
  low: "text-gray-600 bg-gray-50 border-gray-200"
}

interface NotificationCenterProps {
  className?: string
}

export default function NotificationCenter({ className }: NotificationCenterProps) {
  const { user, userPermissions } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [summary, setSummary] = useState({
    total: 0,
    unread: 0,
    byPriority: { urgent: 0, high: 0, medium: 0, low: 0 },
    byType: {}
  })
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)

  // Load notifications
  useEffect(() => {
    async function loadNotifications() {
      if (!user?.id || !userPermissions?.role) return

      try {
        setLoading(true)
        
        const [notificationData, summaryData] = await Promise.all([
          getUserNotifications(
            user.id, 
            userPermissions.role,
            userPermissions.grade || undefined,
            userPermissions.track || undefined,
            10
          ),
          getNotificationSummary(
            user.id,
            userPermissions.role,
            userPermissions.grade || undefined,
            userPermissions.track || undefined
          )
        ])

        setNotifications(notificationData)
        setSummary(summaryData)
      } catch (error) {
        console.error('Error loading notifications:', error)
      } finally {
        setLoading(false)
      }
    }

    loadNotifications()
    
    // Refresh notifications every 2 minutes
    const interval = setInterval(loadNotifications, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [user?.id, userPermissions?.role, userPermissions?.grade, userPermissions?.track])

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId)
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true }
            : notification
        )
      )
      
      setSummary(prev => ({
        ...prev,
        unread: Math.max(0, prev.unread - 1)
      }))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const getPriorityIcon = (priority: NotificationPriority) => {
    switch (priority) {
      case 'urgent': return <AlertTriangle className="w-4 h-4" />
      case 'high': return <AlertCircle className="w-4 h-4" />
      case 'medium': return <Info className="w-4 h-4" />
      case 'low': return <CheckCircle2 className="w-4 h-4" />
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`relative ${className}`}
          disabled={loading}
        >
          <Bell className="h-4 w-4" />
          {summary.unread > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs bg-red-600 hover:bg-red-600"
              variant="default"
            >
              {summary.unread > 99 ? '99+' : summary.unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Notifications</CardTitle>
              <div className="flex gap-1">
                {summary.byPriority.urgent > 0 && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                    {summary.byPriority.urgent} urgent
                  </Badge>
                )}
                {summary.byPriority.high > 0 && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700">
                    {summary.byPriority.high} high
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : notifications.length > 0 ? (
                <div className="space-y-1">
                  {notifications.map((notification, index) => {
                    const IconComponent = notificationIcons[notification.type]
                    const isUnread = !notification.isRead
                    
                    return (
                      <div key={notification.id}>
                        <div 
                          className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors ${
                            isUnread ? 'bg-blue-50/50' : ''
                          }`}
                          onClick={() => {
                            if (isUnread) {
                              handleMarkAsRead(notification.id)
                            }
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-1.5 rounded-full ${priorityColors[notification.priority]}`}>
                              <IconComponent className="w-3 h-3" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <p className={`text-sm font-medium ${isUnread ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    {notification.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                    {notification.message}
                                  </p>
                                </div>
                                
                                <div className="flex flex-col items-end gap-1">
                                  {getPriorityIcon(notification.priority)}
                                  <span className="text-xs text-muted-foreground">
                                    {formatTimeAgo(notification.createdAt)}
                                  </span>
                                </div>
                              </div>
                              
                              {isUnread && (
                                <div className="w-2 h-2 bg-blue-600 rounded-full mt-1"></div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {index < notifications.length - 1 && <Separator />}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="w-12 h-12 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">All caught up!</p>
                  <p className="text-xs text-muted-foreground">No new notifications</p>
                </div>
              )}
            </ScrollArea>
            
            {notifications.length > 0 && (
              <>
                <Separator />
                <div className="p-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-xs"
                    onClick={() => setIsOpen(false)}
                  >
                    View All Notifications
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  )
}