"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/supabase/auth-context"
import AuthGuard from "@/components/auth/auth-guard"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Plus, Edit, Trash2, Save } from "lucide-react"
import {
  getHeadTeacherAssessmentTitles,
  getAvailableAssessmentCodes,
  createAssessmentTitle,
  updateAssessmentTitle,
  deleteAssessmentTitle,
  upsertAssessmentTitle,
  type AssessmentTitleWithClass
} from "@/lib/api/assessment-titles"
import { getClassesByGradeTrack } from "@/lib/api/classes"

export default function AssessmentTitlesPage() {
  const { user, userPermissions } = useAuth()
  const isHeadTeacher = userPermissions?.role === 'head'
  const isAdmin = userPermissions?.role === 'admin'
  const [loading, setLoading] = useState(true)
  const [titles, setTitles] = useState<AssessmentTitleWithClass[]>([])
  const [assessmentCodes, setAssessmentCodes] = useState<string[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTitle, setEditingTitle] = useState<AssessmentTitleWithClass | null>(null)
  const [formData, setFormData] = useState({
    assessment_code: '',
    display_title: '',
    class_id: '',
    grade: userPermissions?.grade || undefined,
    track: userPermissions?.track || undefined,
    scope: 'grade' // 'grade' or 'class'
  })

  // Load initial data
  useEffect(() => {
    async function loadData() {
      if (!user?.id || (!isAdmin && !isHeadTeacher)) return

      try {
        setLoading(true)

        const [codes, titlesData, classesData] = await Promise.all([
          getAvailableAssessmentCodes(),
          isHeadTeacher && userPermissions?.grade && userPermissions?.track 
            ? getHeadTeacherAssessmentTitles(userPermissions.grade, userPermissions.track)
            : [], // Admin would need different logic
          isHeadTeacher && userPermissions?.grade && userPermissions?.track
            ? getClassesByGradeTrack(userPermissions.grade, userPermissions.track)
            : []
        ])

        setAssessmentCodes(codes)
        setTitles(titlesData)
        setClasses(classesData)
      } catch (error) {
        console.error('Error loading assessment titles data:', error)
        toast.error('Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user?.id, userPermissions?.role, userPermissions?.grade, userPermissions?.track, isAdmin, isHeadTeacher])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.assessment_code || !formData.display_title) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      const titleData = {
        assessment_code: formData.assessment_code as any,
        display_name: formData.display_title,
        class_id: formData.scope === 'class' ? formData.class_id || null : null,
        grade: formData.scope === 'grade' ? formData.grade || null : null,
        track: formData.scope === 'grade' ? formData.track as any || null : null
      }

      if (editingTitle) {
        await updateAssessmentTitle(editingTitle.id, titleData)
        toast.success('Assessment title updated successfully')
      } else {
        await upsertAssessmentTitle(
          titleData.assessment_code,
          titleData.display_name,
          titleData.class_id || undefined,
          titleData.grade || undefined,
          titleData.track || undefined,
          user?.id
        )
        toast.success('Assessment title created successfully')
      }

      // Reload data
      if (isHeadTeacher && userPermissions?.grade && userPermissions?.track) {
        const refreshedTitles = await getHeadTeacherAssessmentTitles(
          userPermissions.grade, 
          userPermissions.track
        )
        setTitles(refreshedTitles)
      }

      // Reset form
      setFormData({
        assessment_code: '',
        display_title: '',
        class_id: '',
        grade: userPermissions?.grade || undefined,
        track: userPermissions?.track || undefined,
        scope: 'grade'
      })
      setEditingTitle(null)
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Error saving assessment title:', error)
      toast.error('Failed to save assessment title')
    }
  }

  const handleEdit = (title: AssessmentTitleWithClass) => {
    setEditingTitle(title)
    setFormData({
      assessment_code: title.assessment_code,
      display_title: title.display_name,
      class_id: title.class_id || '',
      grade: title.grade || userPermissions?.grade || undefined,
      track: title.track || userPermissions?.track || undefined,
      scope: title.class_id ? 'class' : 'grade'
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (title: AssessmentTitleWithClass) => {
    if (!confirm('Are you sure you want to delete this assessment title override?')) {
      return
    }

    try {
      await deleteAssessmentTitle(title.id)
      toast.success('Assessment title deleted successfully')
      
      // Reload data
      if (isHeadTeacher && userPermissions?.grade && userPermissions?.track) {
        const refreshedTitles = await getHeadTeacherAssessmentTitles(
          userPermissions.grade, 
          userPermissions.track
        )
        setTitles(refreshedTitles)
      }
    } catch (error) {
      console.error('Error deleting assessment title:', error)
      toast.error('Failed to delete assessment title')
    }
  }

  if (loading) {
    return (
      <AuthGuard requiredRoles={['admin', 'head']}>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard requiredRoles={['admin', 'head']}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Assessment Title Management</h1>
            <p className="text-sm text-muted-foreground">
              {isHeadTeacher 
                ? `Manage assessment display names for Grade ${userPermissions?.grade} ${userPermissions?.track?.charAt(0).toUpperCase()}${userPermissions?.track?.slice(1)} classes`
                : "Manage global assessment display names"
              }
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => {
                  setEditingTitle(null)
                  setFormData({
                    assessment_code: '',
                    display_title: '',
                    class_id: '',
                    grade: userPermissions?.grade || undefined,
                    track: userPermissions?.track || undefined,
                    scope: 'grade'
                  })
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Override
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingTitle ? 'Edit Assessment Title' : 'Add Assessment Title Override'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="assessment_code">Assessment Code</Label>
                    <Select 
                      value={formData.assessment_code}
                      onValueChange={(value) => setFormData({...formData, assessment_code: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select code" />
                      </SelectTrigger>
                      <SelectContent>
                        {assessmentCodes.map(code => (
                          <SelectItem key={code} value={code}>{code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="display_title">Display Title</Label>
                    <Input
                      id="display_title"
                      value={formData.display_title}
                      onChange={(e) => setFormData({...formData, display_title: e.target.value})}
                      placeholder="e.g., Quiz 1"
                      required
                    />
                  </div>
                </div>

                {isHeadTeacher && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Scope</Label>
                      <Select 
                        value={formData.scope}
                        onValueChange={(value: 'grade' | 'class') => setFormData({...formData, scope: value, class_id: ''})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="grade">Grade Level (All Classes)</SelectItem>
                          <SelectItem value="class">Specific Class</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.scope === 'class' && (
                      <div className="space-y-2">
                        <Label htmlFor="class_id">Class</Label>
                        <Select 
                          value={formData.class_id}
                          onValueChange={(value) => setFormData({...formData, class_id: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                          <SelectContent>
                            {classes.map(cls => (
                              <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    <Save className="w-4 h-4 mr-2" />
                    {editingTitle ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Assessment Title Overrides</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assessment Code</TableHead>
                  <TableHead>Display Title</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {titles.length > 0 ? titles.map((title) => (
                  <TableRow key={title.id}>
                    <TableCell>
                      <Badge variant="secondary">{title.assessment_code}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{title.display_name}</TableCell>
                    <TableCell>
                      {title.class_id ? (
                        <Badge variant="outline">Class Specific</Badge>
                      ) : title.grade && title.track ? (
                        <Badge variant="default">Grade {title.grade} {title.track.charAt(0).toUpperCase()}{title.track.slice(1)}</Badge>
                      ) : (
                        <Badge variant="secondary">Global Default</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {title.classes?.name || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(title)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(title)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No assessment title overrides found. 
                      {isHeadTeacher && " Create overrides to customize assessment display names for your grade."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  )
}