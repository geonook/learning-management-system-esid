"use client"

import { useState } from "react"
import FilterBar from "@/components/ui/filter-bar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Users, 
  Plus, 
  GraduationCap, 
  MapPin, 
  Calendar,
  BookOpen,
  MoreVertical,
  Edit,
  Trash,
  Eye
} from "lucide-react"
import RoleGuard from "@/components/auth/role-guard"

// Mock class data
const mockClasses = [
  {
    id: "CLS-001",
    grade: 1,
    section: "A",
    track: "local" as const,
    subject: "English",
    teacher: "John Smith",
    studentCount: 28,
    room: "Room 201",
    schedule: "Mon, Wed, Fri 10:00-11:30",
    status: "active" as const,
    averageScore: 82.5,
    attendanceRate: 94.2
  },
  {
    id: "CLS-002", 
    grade: 1,
    section: "B",
    track: "international",
    subject: "English",
    teacher: "Sarah Johnson",
    studentCount: 24,
    room: "Room 202",
    schedule: "Tue, Thu 09:00-10:30",
    status: "active",
    averageScore: 87.3,
    attendanceRate: 96.1
  },
  {
    id: "CLS-003",
    grade: 2,
    section: "A", 
    track: "local",
    subject: "English",
    teacher: "Mike Wilson",
    studentCount: 26,
    room: "Room 301",
    schedule: "Mon, Wed, Fri 14:00-15:30",
    status: "active",
    averageScore: 79.8,
    attendanceRate: 91.7
  }
]

function NewClassDialog() {
  const [open, setOpen] = useState(false)
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Class
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Class</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Grade</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map((grade) => (
                    <SelectItem key={grade} value={grade.toString()}>
                      Grade {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Section</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {["A", "B", "C", "D"].map((section) => (
                    <SelectItem key={section} value={section}>
                      Section {section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Track</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select track" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Local Track</SelectItem>
                <SelectItem value="international">International Track</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Teacher</Label>
              <Input placeholder="Assign teacher" />
            </div>
            
            <div className="space-y-2">
              <Label>Room</Label>
              <Input placeholder="e.g., Room 201" />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Schedule</Label>
            <Input placeholder="e.g., Mon, Wed, Fri 10:00-11:30" />
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button onClick={() => setOpen(false)} className="flex-1">
              Create Class
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ClassCard({ classData }: { classData: typeof mockClasses[0] }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  
  return (
    <>
      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setDrawerOpen(true)}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">
                Grade {classData.grade}-{classData.section}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={classData.track === "local" ? "secondary" : "outline"} className="capitalize">
                  {classData.track}
                </Badge>
                <Badge variant={classData.status === "active" ? "default" : "secondary"}>
                  {classData.status}
                </Badge>
              </div>
            </div>
            
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid gap-3 text-sm">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <span>{classData.teacher}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{classData.studentCount} students</span>
            </div>
            
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{classData.room}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs">{classData.schedule}</span>
            </div>
          </div>
          
          <div className="grid gap-2 pt-2 border-t text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Average Score:</span>
              <span className="font-medium">{classData.averageScore}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Attendance:</span>
              <span className="font-medium">{classData.attendanceRate}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Class Details Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              Grade {classData.grade}-{classData.section} • {classData.subject}
            </DrawerTitle>
          </DrawerHeader>
          
          <div className="p-4 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Class Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Teacher:</span>
                    <span>{classData.teacher}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Students:</span>
                    <span>{classData.studentCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Room:</span>
                    <span>{classData.room}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Track:</span>
                    <Badge variant="outline" className="capitalize text-xs">
                      {classData.track}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Average Score:</span>
                    <span className="font-medium">{classData.averageScore}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Attendance Rate:</span>
                    <span className="font-medium">{classData.attendanceRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={classData.status === "active" ? "default" : "secondary"}>
                      {classData.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="flex gap-2">
              <Button size="sm" className="flex-1">
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
              <Button size="sm" variant="outline" className="flex-1">
                <Edit className="h-4 w-4 mr-2" />
                Edit Class
              </Button>
              <Button size="sm" variant="destructive" className="flex-1">
                <Trash className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}

function ClassesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  
  const filteredClasses = mockClasses.filter((classData) =>
    classData.teacher.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${classData.grade}-${classData.section}`.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Class Management</h1>
      </div>

      <FilterBar 
        extra={
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search classes or teachers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
            <NewClassDialog />
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredClasses.map((classData) => (
          <ClassCard key={classData.id} classData={classData} />
        ))}
      </div>

      {filteredClasses.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No classes found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery ? "Try adjusting your search terms" : "Get started by creating your first class"}
          </p>
          <NewClassDialog />
        </div>
      )}
    </div>
  )
}

export default function ProtectedClassesPage() {
  return (
    <RoleGuard allowedRoles={["admin", "head"]}>
      <ClassesPage />
    </RoleGuard>
  )
}