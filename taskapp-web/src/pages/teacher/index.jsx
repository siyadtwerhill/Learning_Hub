import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { clsx } from 'clsx'
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  DoorOpen,
  Flame,
  GraduationCap,
  Layers,
  Loader2,
  LogOut,
  Mail,
  Plus,
  Search,
  Send,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getApiErrorMessage, progressApi, roomsApi, tasksApi, usersApi } from '../../services/api'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import ConnectionBadge from '../../components/ui/ConnectionBadge'
import { useWebSocketContext } from '../../context/WebSocketContext'

const navItems = [
  { id: 'rooms', label: 'My Rooms', icon: BookOpen },
  { id: 'progress', label: 'Progress', icon: BarChart3 },
  { id: 'find-student', label: 'Find Student', icon: UserPlus },
]

const priorityStyles = {
  low: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  medium: 'bg-amber-50 text-amber-700 border-amber-100',
  high: 'bg-rose-50 text-rose-700 border-rose-100',
}

export default function TeacherDashboard() {
  const { user, logout } = useAuth()
  const { isConnected, lastMessage } = useWebSocketContext()
  const [activeView, setActiveView] = useState('rooms')
  const [rooms, setRooms] = useState([])
  const [selectedRoomId, setSelectedRoomId] = useState(null)
  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])
  const [progress, setProgress] = useState([])
  const [loading, setLoading] = useState(true)
  const [roomLoading, setRoomLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [showAssignTask, setShowAssignTask] = useState(false)
  const [celebratingStudentId, setCelebratingStudentId] = useState(null)

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) || rooms[0],
    [rooms, selectedRoomId]
  )

  const filteredRooms = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rooms
    return rooms.filter((room) =>
      [room.name, room.subject, room.code].filter(Boolean).some((value) => value.toLowerCase().includes(q))
    )
  }, [rooms, query])

  const loadRooms = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await roomsApi.my()
      setRooms(data)
      setSelectedRoomId((current) => current || data[0]?.id || null)
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not load rooms'))
    } finally {
      setLoading(false)
    }
  }, [])

  const loadRoomWorkspace = useCallback(async (roomId) => {
    if (!roomId) {
      setTasks([])
      setMembers([])
      setProgress([])
      return
    }

    try {
      setRoomLoading(true)
      const [taskRes, memberRes, progressRes] = await Promise.all([
        tasksApi.byRoom(roomId),
        roomsApi.members(roomId),
        progressApi.roomStudents(roomId),
      ])
      setTasks(taskRes.data)
      setMembers(memberRes.data)
      setProgress(progressRes.data)
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not load room details'))
    } finally {
      setRoomLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRooms()
  }, [loadRooms])

  useEffect(() => {
    loadRoomWorkspace(selectedRoom?.id)
  }, [loadRoomWorkspace, selectedRoom?.id])

  useEffect(() => {
    if (!lastMessage || lastMessage.type !== 'task_completed') return
    if (lastMessage.room_id && selectedRoom?.id && lastMessage.room_id !== selectedRoom.id) return

    setProgress((current) =>
      current.map((student) => {
        if (student.student_id !== lastMessage.student_id) return student
        const completed = Number(student.completed_tasks || 0) + 1
        const total = Math.max(Number(student.total_tasks || 0), completed)
        return {
          ...student,
          completed_tasks: completed,
          total_tasks: total,
          completion_rate: total ? Math.round((completed / total) * 100) : 0,
        }
      })
    )
    setCelebratingStudentId(lastMessage.student_id)
    const timer = window.setTimeout(() => setCelebratingStudentId(null), 1800)
    return () => window.clearTimeout(timer)
  }, [lastMessage, selectedRoom?.id])

  useEffect(() => {
    if (!lastMessage || lastMessage.type !== 'room_join_request') return
    if (lastMessage.room_id && selectedRoom?.id && lastMessage.room_id !== selectedRoom.id) return

    setMembers((current) => {
      if (current.some((member) => member.student_id === lastMessage.student_id)) return current
      return [
        ...current,
        {
          id: lastMessage.student_id,
          room_id: lastMessage.room_id || selectedRoom?.id,
          student_id: lastMessage.student_id,
          student_name: lastMessage.student_name || 'Student',
          status: 'pending',
        },
      ]
    })
  }, [lastMessage, selectedRoom?.id])

  const refreshCurrentRoom = async () => {
    await Promise.all([loadRooms(), loadRoomWorkspace(selectedRoom?.id)])
  }

  const openRoom = (room) => {
    setSelectedRoomId(room.id)
    setActiveView('detail')
  }

  const progressStats = useMemo(() => {
    const total = progress.length
    const average = total
      ? Math.round(progress.reduce((sum, item) => sum + Number(item.completion_rate || 0), 0) / total)
      : 0
    const completed = progress.reduce((sum, item) => sum + Number(item.completed_tasks || 0), 0)
    return { total, average, completed }
  }, [progress])

  const reviewMembership = async (studentId, status) => {
    if (!selectedRoom?.id) return
    try {
      await roomsApi.updateMembership(selectedRoom.id, studentId, { status })
      setMembers((current) =>
        current.map((member) =>
          member.student_id === studentId ? { ...member, status } : member
        )
      )
      if (status === 'approved') await loadRoomWorkspace(selectedRoom.id)
      toast.success(status === 'approved' ? 'Student approved' : 'Request rejected')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not update request'))
    }
  }

  return (
    <div className="min-h-screen bg-surface text-ink">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-ink/10 bg-white px-4 py-5 lg:flex lg:flex-col">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Layers size={20} />
          </div>
          <div>
            <p className="font-display text-base font-semibold">TaskFlow</p>
            <p className="text-xs text-ink/45">Teacher workspace</p>
          </div>
        </div>

        <nav className="mt-8 space-y-1">
          {navItems.map((item) => (
            <SidebarButton
              key={item.id}
              item={item}
              active={activeView === item.id}
              onClick={() => setActiveView(item.id)}
            />
          ))}
          <SidebarButton
            item={{ id: 'detail', label: 'Room Detail', icon: ClipboardList }}
            active={activeView === 'detail'}
            disabled={!selectedRoom}
            onClick={() => selectedRoom && setActiveView('detail')}
          />
        </nav>

        <div className="mt-auto rounded-2xl border border-ink/10 bg-surface p-3">
          <p className="text-sm font-semibold">{user?.full_name}</p>
          <p className="mt-0.5 text-xs text-ink/45">{user?.email}</p>
          <button
            type="button"
            onClick={logout}
            className="mt-4 flex items-center gap-2 text-sm font-medium text-ink/55 transition hover:text-brand-700"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-ink/10 bg-white/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Teacher</p>
              <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">
                {activeView === 'detail' && selectedRoom
                  ? selectedRoom.name
                  : activeView === 'progress'
                    ? 'Student Progress'
                    : activeView === 'find-student'
                      ? 'Find Student'
                      : 'My Rooms'}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ConnectionBadge isConnected={isConnected} />
              <Button className="w-auto rounded-2xl px-4 py-2.5" onClick={() => setShowCreateRoom(true)}>
                <Plus size={16} />
                New room
              </Button>
              <Button
                className="w-auto rounded-2xl px-4 py-2.5"
                variant="outline"
                disabled={!selectedRoom}
                onClick={() => setShowAssignTask(true)}
              >
                <Send size={16} />
                Assign task
              </Button>
            </div>
          </div>
        </header>

        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-5 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {navItems.map((item) => (
              <MobileNavButton
                key={item.id}
                item={item}
                active={activeView === item.id}
                onClick={() => setActiveView(item.id)}
              />
            ))}
            <MobileNavButton
              item={{ id: 'detail', label: 'Room Detail', icon: ClipboardList }}
              active={activeView === 'detail'}
              disabled={!selectedRoom}
              onClick={() => selectedRoom && setActiveView('detail')}
            />
          </div>

          {loading ? (
            <LoadingState />
          ) : activeView === 'find-student' ? (
            <FindStudentView rooms={rooms} onInvited={refreshCurrentRoom} />
          ) : activeView === 'progress' ? (
            <ProgressView
              rooms={rooms}
              selectedRoom={selectedRoom}
              setSelectedRoomId={setSelectedRoomId}
              progress={progress}
              stats={progressStats}
              loading={roomLoading}
            />
          ) : activeView === 'detail' && selectedRoom ? (
            <RoomDetail
              room={selectedRoom}
              tasks={tasks}
              members={members}
              progress={progress}
              celebratingStudentId={celebratingStudentId}
              loading={roomLoading}
              onReviewMembership={reviewMembership}
              onAssignTask={() => setShowAssignTask(true)}
            />
          ) : (
            <RoomsView
              rooms={filteredRooms}
              query={query}
              setQuery={setQuery}
              onCreateRoom={() => setShowCreateRoom(true)}
              onOpenRoom={openRoom}
            />
          )}
        </div>
      </main>

      {showCreateRoom && (
        <CreateRoomModal
          onClose={() => setShowCreateRoom(false)}
          onCreated={async () => {
            setShowCreateRoom(false)
            await loadRooms()
          }}
        />
      )}

      {showAssignTask && selectedRoom && (
        <AssignTaskModal
          room={selectedRoom}
          students={progress}
          onClose={() => setShowAssignTask(false)}
          onCreated={async () => {
            setShowAssignTask(false)
            await refreshCurrentRoom()
          }}
        />
      )}
    </div>
  )
}

function SidebarButton({ item, active, disabled, onClick }) {
  const Icon = item.icon
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition',
        active ? 'bg-brand-50 text-brand-700' : 'text-ink/55 hover:bg-ink/5 hover:text-ink',
        disabled && 'cursor-not-allowed opacity-40'
      )}
    >
      <Icon size={18} />
      {item.label}
    </button>
  )
}

function MobileNavButton({ item, active, disabled, onClick }) {
  const Icon = item.icon
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'relative flex min-h-14 min-w-[6.25rem] flex-col items-center justify-center gap-1 rounded-2xl border px-2 text-xs font-medium transition',
        active ? 'border-brand-200 bg-brand-50 text-brand-700' : 'border-ink/10 bg-white text-ink/55',
        disabled && 'cursor-not-allowed opacity-40'
      )}
    >
      <Icon size={17} />
      <span className="text-center leading-tight">{item.label}</span>
    </button>
  )
}

function RoomsView({ rooms, query, setQuery, onCreateRoom, onOpenRoom }) {
  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search rooms"
            className="h-11 w-full rounded-2xl border border-ink/10 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-brand-500 focus:ring-3 focus:ring-brand-100"
          />
        </div>
        <Button className="w-auto rounded-2xl px-4 py-2.5 md:hidden" onClick={onCreateRoom}>
          <Plus size={16} />
          New room
        </Button>
      </div>

      {rooms.length === 0 ? (
        <EmptyState
          icon={DoorOpen}
          title="No rooms yet"
          message="Create your first classroom and share the room code with students."
          actionLabel="Create room"
          onAction={onCreateRoom}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rooms.map((room) => (
            <button
              key={room.id}
              type="button"
              onClick={() => onOpenRoom(room)}
              className="rounded-2xl border border-ink/10 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-semibold">{room.name}</p>
                  <p className="mt-1 text-sm text-ink/50">{room.subject || 'General classroom'}</p>
                </div>
                <span className="rounded-xl border border-brand-100 bg-brand-50 px-2 py-1 font-mono text-xs font-semibold text-brand-700">
                  {room.code}
                </span>
              </div>
              <p className="mt-4 line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-ink/55">
                {room.description || 'No description added.'}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <Metric icon={Users} label="Students" value={room.member_count || 0} />
                <Metric icon={GraduationCap} label="Capacity" value={room.max_students} />
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function RoomDetail({ room, tasks, members, progress, celebratingStudentId, loading, onReviewMembership, onAssignTask }) {
  const approvedMembers = members.filter((member) => member.status === 'approved')
  const pendingMembers = members.filter((member) => member.status === 'pending')

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryTile icon={Users} label="Approved students" value={approvedMembers.length} />
        <SummaryTile icon={ClipboardList} label="Tasks" value={tasks.length} />
        <SummaryTile icon={CalendarDays} label="Pending joins" value={pendingMembers.length} />
        <SummaryTile icon={CheckCircle2} label="Avg completion" value={`${averageCompletion(progress)}%`} />
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-semibold">{room.name}</h2>
              <span className="rounded-xl border border-brand-100 bg-brand-50 px-2 py-1 font-mono text-xs font-semibold text-brand-700">
                {room.code}
              </span>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/55">
              {room.description || 'No description added for this room.'}
            </p>
          </div>
          <Button className="w-auto rounded-2xl px-4 py-2.5" onClick={onAssignTask}>
            <Send size={16} />
            Assign task
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingState compact />
      ) : (
        <div className="space-y-6">
          {pendingMembers.length > 0 && (
            <Panel title="Join Requests" action={`${pendingMembers.length} pending`}>
              <div className="grid gap-3 md:grid-cols-2">
                {pendingMembers.map((member) => (
                  <PendingMemberCard
                    key={member.student_id}
                    member={member}
                    onReview={onReviewMembership}
                  />
                ))}
              </div>
            </Panel>
          )}

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Panel title="Tasks" action={`${tasks.length} total`}>
            {tasks.length === 0 ? (
              <EmptyInline message="No tasks assigned in this room yet." />
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div key={task.id} className="rounded-2xl border border-ink/10 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{task.title}</p>
                        <p className="mt-1 text-sm text-ink/50">{task.description || 'No description.'}</p>
                      </div>
                      <span className={clsx('rounded-xl border px-2 py-1 text-xs font-semibold capitalize', priorityStyles[task.priority])}>
                        {task.priority}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink/45">
                      <span>Due {task.due_date || 'Anytime'}</span>
                      {task.is_daily && <span>Daily task</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Students" action={`${progress.length || approvedMembers.length} active`}>
            {progress.length === 0 ? (
              <EmptyInline message="Students will appear here after joining and approval." />
            ) : (
              <div className="space-y-3">
                {progress.map((student) => (
                  <StudentRow
                    key={student.student_id}
                    student={student}
                    celebrating={celebratingStudentId === student.student_id}
                  />
                ))}
              </div>
            )}
          </Panel>
          </div>
        </div>
      )}
    </section>
  )
}

function ProgressView({ rooms, selectedRoom, setSelectedRoomId, progress, stats, loading }) {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {rooms.map((room) => (
            <button
              key={room.id}
              type="button"
              onClick={() => setSelectedRoomId(room.id)}
              className={clsx(
                'rounded-2xl border px-3 py-2 text-sm font-medium transition',
                selectedRoom?.id === room.id
                  ? 'border-brand-200 bg-brand-50 text-brand-700'
                  : 'border-ink/10 bg-white text-ink/55 hover:text-ink'
              )}
            >
              {room.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryTile icon={Users} label="Students" value={stats.total} />
        <SummaryTile icon={CheckCircle2} label="Avg completion" value={`${stats.average}%`} />
        <SummaryTile icon={Flame} label="Completed tasks" value={stats.completed} />
      </div>

      <Panel title={selectedRoom ? `${selectedRoom.name} progress` : 'Progress'} action="Live room summary">
        {loading ? (
          <LoadingState compact />
        ) : progress.length === 0 ? (
          <EmptyInline message="No progress data yet. Assign a task after students join the room." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-ink/10 text-xs uppercase tracking-wide text-ink/40">
                <tr>
                  <th className="py-3 font-semibold">Student</th>
                  <th className="py-3 font-semibold">Tasks</th>
                  <th className="py-3 font-semibold">Completed</th>
                  <th className="py-3 font-semibold">Completion</th>
                  <th className="py-3 font-semibold">Streak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {progress.map((student) => (
                  <tr key={student.student_id}>
                    <td className="py-4">
                      <p className="font-semibold">{student.full_name}</p>
                      <p className="text-xs text-ink/45">@{student.username}</p>
                    </td>
                    <td className="py-4">{student.total_tasks}</td>
                    <td className="py-4">{student.completed_tasks}</td>
                    <td className="py-4">
                      <ProgressBar value={student.completion_rate} />
                    </td>
                    <td className="py-4">{student.current_streak} days</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </section>
  )
}

function PendingMemberCard({ member, onReview }) {
  return (
    <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
      <div className="flex items-start gap-3">
        <StudentAvatar name={member.student_name} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-semibold">{member.student_name || 'Student'}</p>
          <p className="truncate text-xs text-ink/45">{member.student_email || 'Waiting for approval'}</p>
          <p className="mt-1 font-mono text-[11px] text-ink/35">{member.student_id}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button
          className="rounded-2xl px-3 py-2.5"
          onClick={() => onReview(member.student_id, 'approved')}
        >
          <CheckCircle2 size={15} />
          Approve
        </Button>
        <Button
          className="rounded-2xl px-3 py-2.5"
          variant="outline"
          onClick={() => onReview(member.student_id, 'rejected')}
        >
          <X size={15} />
          Reject
        </Button>
      </div>
    </div>
  )
}

function FindStudentView({ rooms, onInvited }) {
  const [student, setStudent] = useState(null)
  const [selectedRoomId, setSelectedRoomId] = useState(rooms[0]?.id || '')
  const [searching, setSearching] = useState(false)
  const [inviting, setInviting] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm()

  useEffect(() => {
    if (!selectedRoomId && rooms[0]?.id) setSelectedRoomId(rooms[0].id)
  }, [rooms, selectedRoomId])

  const searchStudent = async ({ email }) => {
    try {
      setSearching(true)
      const { data } = await usersApi.searchStudent(email)
      setStudent(data)
    } catch (err) {
      setStudent(null)
      toast.error(getApiErrorMessage(err, 'Student not found'))
    } finally {
      setSearching(false)
    }
  }

  const inviteStudent = async () => {
    if (!student || !selectedRoomId) return
    try {
      setInviting(true)
      await roomsApi.invite(selectedRoomId, { student_id: student.id })
      toast.success('Student added to room')
      await onInvited()
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not add student'))
    } finally {
      setInviting(false)
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold">Search by email</h2>
        <p className="mt-1 text-sm text-ink/50">Find an existing student account and add them directly to one of your rooms.</p>
        <form onSubmit={handleSubmit(searchStudent)} className="mt-5 space-y-4">
          <Input
            label="Student email"
            type="email"
            icon={Mail}
            placeholder="student@example.com"
            error={errors.email?.message}
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' },
            })}
          />
          <Button className="rounded-2xl" loading={searching}>
            <Search size={16} />
            Find student
          </Button>
        </form>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Result</h2>
          <span className="text-xs font-medium text-ink/45">{rooms.length} rooms available</span>
        </div>

        {!student ? (
          <EmptyInline message="Search for a student to add them to a room." />
        ) : (
          <div className="mt-5 space-y-5">
            <div className="flex items-center gap-4 rounded-2xl border border-ink/10 p-4">
              <StudentAvatar name={student.full_name} />
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-semibold">{student.full_name}</p>
                <p className="text-sm text-ink/50">{student.email}</p>
                <p className="mt-1 text-xs text-ink/40">@{student.username}</p>
              </div>
              <span className="rounded-2xl bg-brand-50 px-3 py-1 text-xs font-semibold capitalize text-brand-700">
                {student.role}
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <div className="flex flex-col gap-1.5">
                <label className="font-display text-sm font-medium text-ink/70">Add to room</label>
                <select
                  value={selectedRoomId}
                  onChange={(event) => setSelectedRoomId(event.target.value)}
                  className="h-12 rounded-2xl border border-ink/10 bg-white px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-3 focus:ring-brand-100"
                >
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>{room.name}</option>
                  ))}
                </select>
              </div>
              <Button
                className="w-auto rounded-2xl px-5"
                disabled={!rooms.length}
                loading={inviting}
                onClick={inviteStudent}
              >
                <UserPlus size={16} />
                Add student
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function CreateRoomModal({ onClose, onCreated }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { max_students: 50 },
  })

  const onSubmit = async (values) => {
    try {
      await roomsApi.create({
        ...values,
        max_students: Number(values.max_students || 50),
      })
      toast.success('Room created')
      await onCreated()
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not create room'))
    }
  }

  return (
    <Modal title="Create room" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Room name"
          error={errors.name?.message}
          {...register('name', { required: 'Room name is required' })}
        />
        <Input label="Subject" {...register('subject')} />
        <div className="flex flex-col gap-1.5">
          <label className="font-display text-sm font-medium text-ink/70">Description</label>
          <textarea
            rows={4}
            className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-3 focus:ring-brand-100"
            {...register('description')}
          />
        </div>
        <Input
          label="Max students"
          type="number"
          min="1"
          max="200"
          error={errors.max_students?.message}
          {...register('max_students', {
            min: { value: 1, message: 'Must be at least 1' },
            max: { value: 200, message: 'Keep it under 200' },
          })}
        />
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>Create room</Button>
        </div>
      </form>
    </Modal>
  )
}

function AssignTaskModal({ room, students, onClose, onCreated }) {
  const [selectedStudentIds, setSelectedStudentIds] = useState([])
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { priority: 'medium' },
  })

  const allSelected = selectedStudentIds.length === 0

  const toggleStudent = (studentId) => {
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId]
    )
  }

  const onSubmit = async (values) => {
    try {
      await tasksApi.create({
        title: values.title,
        description: values.description || null,
        priority: values.priority,
        due_date: values.due_date || null,
        is_daily: Boolean(values.is_daily),
        room_id: room.id,
        assign_to: selectedStudentIds.length ? selectedStudentIds : null,
      })
      toast.success('Task assigned')
      await onCreated()
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not assign task'))
    }
  }

  return (
    <Modal title={`Assign task to ${room.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Task title"
          error={errors.title?.message}
          {...register('title', { required: 'Task title is required' })}
        />
        <div className="flex flex-col gap-1.5">
          <label className="font-display text-sm font-medium text-ink/70">Description</label>
          <textarea
            rows={3}
            className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-3 focus:ring-brand-100"
            {...register('description')}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="font-display text-sm font-medium text-ink/70">Priority</label>
            <select
              className="h-12 rounded-2xl border border-ink/10 bg-white px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-3 focus:ring-brand-100"
              {...register('priority')}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <Input label="Due date" type="date" {...register('due_date')} />
        </div>

        <label className="flex items-center gap-2 text-sm text-ink/65">
          <input type="checkbox" className="h-4 w-4 rounded border-ink/20 text-brand-600" {...register('is_daily')} />
          Repeat daily
        </label>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="font-display text-sm font-medium text-ink/70">Assign to</p>
            <button
              type="button"
              onClick={() => setSelectedStudentIds([])}
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              All students
            </button>
          </div>
          <div className="max-h-44 space-y-2 overflow-y-auto rounded-2xl border border-ink/10 p-2">
            {students.length === 0 ? (
              <p className="px-2 py-3 text-sm text-ink/45">No approved students yet. The task will be saved for this room.</p>
            ) : (
              students.map((student) => (
                <label
                  key={student.student_id}
                  className={clsx(
                    'flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-sm transition',
                    allSelected || selectedStudentIds.includes(student.student_id)
                      ? 'bg-brand-50 text-brand-700'
                      : 'hover:bg-ink/5'
                  )}
                >
                  <span>
                    <span className="font-medium">{student.full_name}</span>
                    <span className="ml-2 text-xs text-ink/45">@{student.username}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={allSelected || selectedStudentIds.includes(student.student_id)}
                    onChange={() => toggleStudent(student.student_id)}
                    className="h-4 w-4 rounded border-ink/20 text-brand-600"
                  />
                </label>
              ))
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>Assign task</Button>
        </div>
      </form>
    </Modal>
  )
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-2xl text-ink/45 transition hover:bg-ink/5 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function SummaryTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-ink/45">{label}</p>
          <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <Icon size={19} />
        </div>
      </div>
    </div>
  )
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-surface p-3">
      <div className="flex items-center gap-2 text-ink/45">
        <Icon size={15} />
        <span>{label}</span>
      </div>
      <p className="mt-1 font-display text-lg font-semibold text-ink">{value}</p>
    </div>
  )
}

function Panel({ title, action, children }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {action && <span className="text-xs font-medium text-ink/45">{action}</span>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function StudentRow({ student, celebrating }) {
  return (
    <div className={clsx(
      'relative overflow-hidden rounded-2xl border p-4 transition duration-500',
      celebrating ? 'border-brand-300 bg-brand-50 ring-4 ring-brand-100' : 'border-ink/10'
    )}>
      {celebrating && (
        <div className="pointer-events-none absolute right-4 top-3 flex gap-1 text-brand-600">
          <span className="h-1.5 w-1.5 animate-ping rounded-full bg-brand-500" />
          <span className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-500 animation-delay-100" />
          <span className="h-1.5 w-1.5 animate-ping rounded-full bg-amber-500 animation-delay-200" />
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{student.full_name}</p>
          <p className="text-xs text-ink/45">@{student.username}</p>
        </div>
        <span className="rounded-xl bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
          {student.current_streak} day streak
        </span>
      </div>
      <div className="mt-3">
        <ProgressBar value={student.completion_rate} />
      </div>
      <p className="mt-2 text-xs text-ink/45">
        {student.completed_tasks} of {student.total_tasks} tasks complete
      </p>
    </div>
  )
}

function StudentAvatar({ name }) {
  const initials = (name || 'ST')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 font-display text-base font-semibold text-brand-700">
      {initials}
    </div>
  )
}

function ProgressBar({ value }) {
  const safeValue = Math.max(0, Math.min(100, Number(value || 0)))
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-full rounded-full bg-ink/10">
        <div className="h-2 rounded-full bg-brand-600" style={{ width: `${safeValue}%` }} />
      </div>
      <span className="w-12 text-right text-xs font-semibold text-ink/55">{safeValue}%</span>
    </div>
  )
}

function LoadingState({ compact }) {
  return (
    <div className={clsx('flex items-center justify-center', compact ? 'py-10' : 'min-h-[50vh]')}>
      <div className="flex items-center gap-2 text-sm text-ink/45">
        <Loader2 size={18} className="animate-spin" />
        Loading
      </div>
    </div>
  )
}

function EmptyState({ icon: Icon, title, message, actionLabel, onAction }) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-ink/15 bg-white p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
        <Icon size={22} />
      </div>
      <h2 className="mt-4 font-display text-xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-ink/50">{message}</p>
      {actionLabel && (
        <Button className="mt-5 w-auto rounded-2xl px-4 py-2.5" onClick={onAction}>
          <Plus size={16} />
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

function EmptyInline({ message }) {
  return <p className="rounded-2xl border border-dashed border-ink/15 bg-surface px-4 py-6 text-center text-sm text-ink/45">{message}</p>
}

function averageCompletion(progress) {
  if (!progress.length) return 0
  return Math.round(progress.reduce((sum, item) => sum + Number(item.completion_rate || 0), 0) / progress.length)
}
