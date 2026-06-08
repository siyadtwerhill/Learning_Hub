import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { clsx } from 'clsx'
import {
  Bell,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock3,
  Flame,
  Layers,
  Loader2,
  LogOut,
  Plus,
  RotateCcw,
  UserRound,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  getApiErrorMessage,
  notificationsApi,
  progressApi,
  roomsApi,
  tasksApi,
} from '../../services/api'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import ConnectionBadge from '../../components/ui/ConnectionBadge'
import { useWebSocketContext } from '../../context/WebSocketContext'

const navItems = [
  { id: 'tasks', label: 'Tasks', icon: CheckCircle2 },
  { id: 'streak', label: 'Streak', icon: Flame },
  { id: 'rooms', label: 'Rooms', icon: BookOpen },
  { id: 'notifications', label: 'Notifications', icon: Bell },
]

const statusFlow = {
  not_started: 'in_progress',
  in_progress: 'done',
  done: 'not_started',
  overdue: 'in_progress',
}

const statusLabels = {
  not_started: 'Not started',
  in_progress: 'In progress',
  done: 'Done',
  overdue: 'Overdue',
}

const priorityStyles = {
  low: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  medium: 'bg-amber-50 text-amber-700 border-amber-100',
  high: 'bg-rose-50 text-rose-700 border-rose-100',
}

export default function StudentDashboard() {
  const { user, logout } = useAuth()
  const { isConnected, lastMessage } = useWebSocketContext()
  const [activeView, setActiveView] = useState('tasks')
  const [tasks, setTasks] = useState([])
  const [highlightedTaskId, setHighlightedTaskId] = useState(null)
  const [rooms, setRooms] = useState([])
  const [streak, setStreak] = useState(null)
  const [daily, setDaily] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [taskFilter, setTaskFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  const loadStudentData = useCallback(async () => {
    try {
      setLoading(true)
      const [taskRes, roomRes, streakRes, dailyRes, notifRes, unreadRes] = await Promise.all([
        tasksApi.today(),
        roomsApi.joined(),
        progressApi.streak(),
        progressApi.daily(),
        notificationsApi.list(false),
        notificationsApi.unreadCount(),
      ])
      setTasks(taskRes.data)
      setRooms(roomRes.data)
      setStreak(streakRes.data)
      setDaily(dailyRes.data)
      setNotifications(notifRes.data)
      setUnreadCount(unreadRes.data.unread_count || 0)
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not load dashboard'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStudentData()
  }, [loadStudentData])

  useEffect(() => {
    if (!lastMessage || lastMessage.type !== 'task_assigned') return

    const assignmentId = lastMessage.assignment_id || lastMessage.task_id
    const nextTask = {
      id: assignmentId,
      task_id: lastMessage.task_id,
      student_id: user?.id,
      status: 'not_started',
      assigned_date: new Date().toISOString().slice(0, 10),
      completed_at: null,
      task: {
        id: lastMessage.task_id,
        title: lastMessage.title,
        description: lastMessage.description,
        priority: lastMessage.priority || 'medium',
        due_date: lastMessage.due_date,
        room_id: lastMessage.room_id,
      },
      room: lastMessage.room_name
        ? { id: lastMessage.room_id, name: lastMessage.room_name }
        : null,
      isLiveNew: true,
    }

    setTasks((current) => {
      if (current.some((item) => item.id === assignmentId || item.task_id === lastMessage.task_id)) return current
      return [nextTask, ...current]
    })
    setHighlightedTaskId(assignmentId)
    const timer = window.setTimeout(() => setHighlightedTaskId(null), 2000)
    return () => window.clearTimeout(timer)
  }, [lastMessage, user?.id])

  const filteredTasks = useMemo(() => {
    if (taskFilter === 'pending') return tasks.filter((task) => task.status !== 'done')
    if (taskFilter === 'done') return tasks.filter((task) => task.status === 'done')
    return tasks
  }, [tasks, taskFilter])

  const updateTaskStatus = async (assignment) => {
    const nextStatus = statusFlow[assignment.status] || 'in_progress'
    try {
      const { data } = await tasksApi.updateAssignmentStatus(assignment.id, { status: nextStatus })
      setTasks((current) =>
        current.map((item) =>
          item.id === assignment.id
            ? { ...item, status: data.status, completed_at: data.completed_at }
            : item
        )
      )
      toast.success(`Task marked ${statusLabels[nextStatus].toLowerCase()}`)
      if (nextStatus === 'done') {
        const [streakRes, dailyRes] = await Promise.all([progressApi.streak(), progressApi.daily()])
        setStreak(streakRes.data)
        setDaily(dailyRes.data)
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not update task'))
    }
  }

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead()
      setNotifications((current) => current.map((item) => ({ ...item, is_read: true })))
      setUnreadCount(0)
      toast.success('Notifications marked read')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not update notifications'))
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
            <p className="text-xs text-ink/45">Student workspace</p>
          </div>
        </div>

        <nav className="mt-8 space-y-1">
          {navItems.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              active={activeView === item.id}
              badge={item.id === 'notifications' ? unreadCount : 0}
              onClick={() => setActiveView(item.id)}
            />
          ))}
        </nav>

        <ProfileBlock user={user} logout={logout} />
      </aside>

      <main className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-ink/10 bg-white/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Student</p>
              <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">{pageTitle(activeView)}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ConnectionBadge isConnected={isConnected} />
              <div className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-white px-3 py-2 shadow-sm">
              <Avatar name={user?.full_name} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user?.full_name}</p>
                <p className="text-xs capitalize text-ink/45">{user?.role}</p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-ink/45 transition hover:bg-ink/5 hover:text-ink"
              >
                <LogOut size={17} />
              </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {navItems.map((item) => (
              <MobileNavButton
                key={item.id}
                item={item}
                active={activeView === item.id}
                badge={item.id === 'notifications' ? unreadCount : 0}
                onClick={() => setActiveView(item.id)}
              />
            ))}
          </div>
        </header>

        <div className="px-4 py-6 sm:px-6 lg:px-8">
          {loading ? (
            <LoadingState />
          ) : activeView === 'streak' ? (
            <StreakView streak={streak} daily={daily} />
          ) : activeView === 'rooms' ? (
            <RoomsView rooms={rooms} onJoined={loadStudentData} />
          ) : activeView === 'notifications' ? (
            <NotificationsView
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAllRead={markAllRead}
            />
          ) : (
            <TasksView
              tasks={filteredTasks}
              highlightedTaskId={highlightedTaskId}
              filter={taskFilter}
              setFilter={setTaskFilter}
              onUpdateStatus={updateTaskStatus}
            />
          )}
        </div>
      </main>
    </div>
  )
}

function TasksView({ tasks, highlightedTaskId, filter, setFilter, onUpdateStatus }) {
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {[
          ['all', 'All'],
          ['pending', 'Pending'],
          ['done', 'Done'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={clsx(
              'rounded-2xl border px-4 py-2 text-sm font-medium transition',
              filter === id ? 'border-brand-200 bg-brand-50 text-brand-700' : 'border-ink/10 bg-white text-ink/55 hover:text-ink'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tasks.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="No tasks here" message="You do not have tasks in this filter right now." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {tasks.map((assignment) => (
            <TaskCard
              key={assignment.id}
              assignment={assignment}
              highlighted={highlightedTaskId === assignment.id}
              onUpdateStatus={onUpdateStatus}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function TaskCard({ assignment, highlighted, onUpdateStatus }) {
  const task = assignment.task || {}
  const done = assignment.status === 'done'
  return (
    <article className={clsx(
      'rounded-2xl border bg-white p-5 shadow-sm transition duration-500',
      highlighted ? 'border-brand-300 bg-brand-50 ring-4 ring-brand-100' : 'border-ink/10'
    )}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-lg font-semibold">{task.title || 'Task'}</p>
          <p className="mt-1 text-sm text-ink/50">{assignment.room?.name || 'Solo task'}</p>
        </div>
        <span className={clsx('rounded-xl border px-2.5 py-1 text-xs font-semibold capitalize', priorityStyles[task.priority || 'medium'])}>
          {task.priority || 'medium'}
        </span>
      </div>
      <p className="mt-4 line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-ink/55">
        {task.description || 'No description.'}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <StatusBadge status={assignment.status} />
        <Button
          className="w-auto rounded-2xl px-4 py-2.5"
          variant={done ? 'outline' : 'primary'}
          onClick={() => onUpdateStatus(assignment)}
        >
          {done ? <RotateCcw size={15} /> : <CheckCircle2 size={15} />}
          {done ? 'Reset' : statusLabels[statusFlow[assignment.status] || 'in_progress']}
        </Button>
      </div>
    </article>
  )
}

function StreakView({ streak, daily }) {
  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryTile icon={Flame} label="Current streak" value={`${streak?.current_streak || 0} days`} featured />
        <SummaryTile icon={Clock3} label="Longest streak" value={`${streak?.longest_streak || 0} days`} />
        <SummaryTile icon={CheckCircle2} label="Tasks completed" value={streak?.total_tasks_completed || 0} />
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">Daily summary</h2>
            <p className="mt-1 text-sm text-ink/50">{daily?.summary_date || 'Today'}</p>
          </div>
          <div className="grid flex-1 gap-3 sm:grid-cols-4">
            <MiniStat label="Total" value={daily?.total_tasks || 0} />
            <MiniStat label="Done" value={daily?.completed_tasks || 0} />
            <MiniStat label="Overdue" value={daily?.overdue_tasks || 0} />
            <MiniStat label="Rate" value={`${daily?.completion_rate || 0}%`} />
          </div>
        </div>
      </div>
    </section>
  )
}

function RoomsView({ rooms, onJoined }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  const joinRoom = async ({ code }) => {
    try {
      await roomsApi.join({ code })
      toast.success('Join request sent')
      reset()
      await onJoined()
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not join room'))
    }
  }

  return (
    <section className="space-y-6">
      <form onSubmit={handleSubmit(joinRoom)} className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <Input
              label="Join a room"
              placeholder="Enter room code"
              error={errors.code?.message}
              {...register('code', { required: 'Room code is required' })}
            />
          </div>
          <Button className="w-auto rounded-2xl px-5" loading={isSubmitting}>
            <Plus size={16} />
            Join
          </Button>
        </div>
      </form>

      {rooms.length === 0 ? (
        <EmptyState icon={BookOpen} title="No joined rooms" message="Use a room code from your teacher to join a class." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rooms.map((room) => (
            <article key={room.room_id} className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-semibold">{room.name}</p>
                  <p className="mt-1 text-sm text-ink/50">{room.subject || 'General classroom'}</p>
                </div>
                <span className="rounded-xl border border-brand-100 bg-brand-50 px-2.5 py-1 font-mono text-xs font-semibold text-brand-700">
                  {room.code}
                </span>
              </div>
              <div className="mt-5 flex items-center gap-3 rounded-2xl bg-surface p-3">
                <Avatar name={room.teacher_name} small />
                <div>
                  <p className="text-xs text-ink/45">Teacher</p>
                  <p className="text-sm font-semibold">{room.teacher_name || 'Teacher'}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function NotificationsView({ notifications, unreadCount, onMarkAllRead }) {
  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-ink/50">{unreadCount} unread notifications</p>
        <Button className="w-auto rounded-2xl px-4 py-2.5" variant="outline" onClick={onMarkAllRead}>
          Mark all read
        </Button>
      </div>

      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" message="Updates from rooms and tasks will appear here." />
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={clsx(
                'rounded-2xl border bg-white p-5 shadow-sm',
                notification.is_read ? 'border-ink/10' : 'border-brand-200'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={clsx('mt-1 flex h-9 w-9 items-center justify-center rounded-xl', notification.is_read ? 'bg-surface text-ink/40' : 'bg-brand-50 text-brand-700')}>
                  <Bell size={17} />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{notification.title}</p>
                    {!notification.is_read && <span className="h-2 w-2 rounded-full bg-brand-600" />}
                  </div>
                  <p className="mt-1 text-sm leading-5 text-ink/55">{notification.message}</p>
                  <p className="mt-3 text-xs text-ink/35">{formatDate(notification.created_at)}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function NavButton({ item, active, badge, onClick }) {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-medium transition',
        active ? 'bg-brand-50 text-brand-700' : 'text-ink/55 hover:bg-ink/5 hover:text-ink'
      )}
    >
      <span className="flex items-center gap-3">
        <Icon size={18} />
        {item.label}
      </span>
      {badge > 0 && <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs text-white">{badge}</span>}
    </button>
  )
}

function MobileNavButton({ item, active, badge, onClick }) {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'relative flex min-h-14 min-w-[5.75rem] flex-col items-center justify-center gap-1 rounded-2xl border px-2 text-xs font-medium transition',
        active ? 'border-brand-200 bg-brand-50 text-brand-700' : 'border-ink/10 bg-white text-ink/55'
      )}
    >
      <Icon size={17} />
      <span>{item.label}</span>
      {badge > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-brand-600" />}
    </button>
  )
}

function ProfileBlock({ user, logout }) {
  return (
    <div className="mt-auto rounded-2xl border border-ink/10 bg-surface p-3">
      <div className="flex items-center gap-3">
        <Avatar name={user?.full_name} small />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user?.full_name}</p>
          <p className="text-xs text-ink/45">{user?.email}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={logout}
        className="mt-4 flex items-center gap-2 text-sm font-medium text-ink/55 transition hover:text-brand-700"
      >
        <LogOut size={15} />
        Sign out
      </button>
    </div>
  )
}

function SummaryTile({ icon: Icon, label, value, featured }) {
  return (
    <div className={clsx('rounded-2xl border border-ink/10 bg-white p-5 shadow-sm', featured && 'bg-brand-600 text-white')}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={clsx('text-sm', featured ? 'text-white/70' : 'text-ink/45')}>{label}</p>
          <p className="mt-1 font-display text-3xl font-semibold">{value}</p>
        </div>
        <div className={clsx('flex h-12 w-12 items-center justify-center rounded-2xl', featured ? 'bg-white/15 text-white' : 'bg-brand-50 text-brand-700')}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-surface p-4">
      <p className="text-xs text-ink/45">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold">{value}</p>
    </div>
  )
}

function StatusBadge({ status }) {
  const done = status === 'done'
  const Icon = done ? CheckCircle2 : status === 'in_progress' ? Clock3 : Circle
  return (
    <span className={clsx('flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-xs font-semibold', done ? 'bg-emerald-50 text-emerald-700' : 'bg-surface text-ink/55')}>
      <Icon size={14} />
      {statusLabels[status] || status}
    </span>
  )
}

function Avatar({ name, small }) {
  const initials = (name || 'Student')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className={clsx('flex shrink-0 items-center justify-center rounded-2xl bg-brand-50 font-display font-semibold text-brand-700', small ? 'h-9 w-9 text-xs' : 'h-11 w-11 text-sm')}>
      {initials || <UserRound size={16} />}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex items-center gap-2 text-sm text-ink/45">
        <Loader2 size={18} className="animate-spin" />
        Loading
      </div>
    </div>
  )
}

function EmptyState({ icon: Icon, title, message }) {
  return (
    <div className="flex min-h-[340px] flex-col items-center justify-center rounded-2xl border border-dashed border-ink/15 bg-white p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
        <Icon size={22} />
      </div>
      <h2 className="mt-4 font-display text-xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-ink/50">{message}</p>
    </div>
  )
}

function pageTitle(activeView) {
  if (activeView === 'streak') return 'My Streak'
  if (activeView === 'rooms') return 'My Rooms'
  if (activeView === 'notifications') return 'Notifications'
  return "Today's Tasks"
}

function formatDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}
