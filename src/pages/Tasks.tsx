import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    X,
    Calendar,
    CheckCircle,
    Clock,
    AlertCircle,
    ClipboardList,
    Loader2,
    Briefcase,
    Play,
    Ban,
    CalendarDays,
} from 'lucide-react';
import {
    DndContext,
    DragOverlay,
    closestCenter,
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    useDroppable,
    useDraggable,
    type DragStartEvent,
    type DragEndEvent,
    type DragOverEvent,
} from '@dnd-kit/core';
import { useMyTasks, useUpdateTaskState } from '../api/tasks/hooks';
import type { Task, TaskState, TaskDifficulty, GamificationResult } from '../api/tasks/types';
import PointsEarnedModal from '../components/PointsEarnedModal';
import BadgeEarnedModal from '../components/BadgeEarnedModal';

/* ─── Types ─────────────────────────────────────────────── */

type DateFilterKey = 'all' | 'today' | 'week' | 'month' | 'custom';
type MappedStatus = 'todo' | 'in_progress' | 'done';

interface MappedTask {
    id: string;
    title: string;
    description: string;
    status: MappedStatus;
    state: TaskState;
    difficulty: TaskDifficulty;
    startDate: string;
    endDate: string;
    dueDate: string;
    projectName: string;
    projectId: string;
    blockReason: string;
}

/* ─── State mapping ──────────────────────────────────────── */

const STATE_TO_STATUS: Record<TaskState, MappedStatus> = {
    CREATED: 'todo',
    ASSIGNED: 'todo',
    IN_PROGRESS: 'in_progress',
    BLOCKED: 'in_progress',
    COMPLETED: 'done',
    REVIEWED: 'done',
};

/* ─── Kanban constants ───────────────────────────────────── */

const COLUMNS: MappedStatus[] = ['todo', 'in_progress', 'done'];

const ALLOWED_TRANSITIONS: Record<MappedStatus, MappedStatus[]> = {
    todo: ['in_progress'],
    in_progress: ['done'],
    done: [],
};

const DROP_TARGET_STATE: Record<MappedStatus, TaskState> = {
    todo: 'CREATED',
    in_progress: 'IN_PROGRESS',
    done: 'COMPLETED',
};

const COLUMN_COLORS: Record<MappedStatus, { headerBg: string; headerText: string; dropRing: string }> = {
    todo: { headerBg: 'bg-[#283852]/10', headerText: 'text-[#283852]', dropRing: 'ring-[#283852]/30 bg-[#283852]/5' },
    in_progress: { headerBg: 'bg-[#33cbcc]/10', headerText: 'text-[#33cbcc]', dropRing: 'ring-[#33cbcc]/30 bg-[#33cbcc]/5' },
    done: { headerBg: 'bg-gray-100', headerText: 'text-gray-500', dropRing: 'ring-gray-300 bg-gray-50' },
};

const canTransition = (from: MappedStatus, to: MappedStatus) =>
    ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;

/* ─── Helpers ────────────────────────────────────────────── */

const fmtDate = (d: string | undefined) => {
    if (!d) return '--';
    return new Date(d).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

const diffDays = (a: Date, b: Date) =>
    Math.round((b.getTime() - a.getTime()) / 86_400_000);

const isOverdue = (task: MappedTask) => {
    if (task.status === 'done') return false;
    const due = task.dueDate || task.endDate;
    if (!due) return false;
    return new Date(due) < new Date();
};

const getDateRange = (key: DateFilterKey): [Date, Date] | null => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (key) {
        case 'today':
            return [startOfDay, new Date(startOfDay.getTime() + 86_400_000 - 1)];
        case 'week': {
            const day = startOfDay.getDay();
            const monday = new Date(startOfDay.getTime() - ((day === 0 ? 6 : day - 1) * 86_400_000));
            const sunday = new Date(monday.getTime() + 7 * 86_400_000 - 1);
            return [monday, sunday];
        }
        case 'month': {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            return [firstDay, lastDay];
        }
        default:
            return null;
    }
};

const taskMatchesDateFilter = (
    task: MappedTask,
    filterKey: DateFilterKey,
    customFrom: string,
    customTo: string,
): boolean => {
    if (filterKey === 'all') return true;

    const taskDate = task.startDate || task.dueDate || task.endDate;
    if (!taskDate) return false;
    const d = new Date(taskDate);

    if (filterKey === 'custom') {
        if (!customFrom && !customTo) return true;
        if (customFrom && d < new Date(customFrom)) return false;
        if (customTo && d > new Date(customTo + 'T23:59:59')) return false;
        return true;
    }

    const range = getDateRange(filterKey);
    if (!range) return true;
    return d >= range[0] && d <= range[1];
};

const getDifficultyBorder = (difficulty: TaskDifficulty) => {
    switch (difficulty) {
        case 'EASY':
            return 'border-l-4 border-l-[#33cbcc]';
        case 'MEDIUM':
            return 'border-l-4 border-l-[#283852]';
        case 'HARD':
            return 'border-l-4 border-l-[#283852] bg-[#283852]/5';
        default:
            return 'border-l-4 border-l-gray-300';
    }
};

/* ─── Kanban Card (Draggable) ────────────────────────────── */

const KanbanCard = ({
    task,
    onClick,
}: {
    task: MappedTask;
    onClick: () => void;
}) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
        data: { task },
    });

    const style = {
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`bg-white rounded-xl p-4 border border-gray-100 hover:border-[#33cbcc]/30 transition-all cursor-pointer group relative ${getDifficultyBorder(task.difficulty)} ${isDragging ? 'shadow-lg z-50' : 'shadow-sm'}`}
            onClick={onClick}
        >
            {/* Title + project */}
            <div className="mb-2">
                <h3 className="text-sm font-bold text-gray-800 truncate pr-6 group-hover:text-[#283852] transition-colors">
                    {task.title}
                </h3>
                {task.projectName && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{task.projectName}</p>
                )}
            </div>

            {/* Description */}
            {task.description && (
                <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">
                    {task.description}
                </p>
            )}

            {/* Due date */}
            {(task.dueDate || task.endDate) && (
                <div className={`flex items-center gap-1 text-[11px] mt-auto pt-2 border-t border-gray-50 ${isOverdue(task) ? 'text-[#283852] font-semibold' : 'text-gray-400'}`}>
                    <Calendar size={12} />
                    <span>{fmtDate(task.dueDate || task.endDate)}</span>
                </div>
            )}
        </div>
    );
};

/* ─── Drag Overlay Card ──────────────────────────────────── */

const DragOverlayCard = ({ task }: { task: MappedTask }) => (
    <div className={`bg-white rounded-xl p-4 border border-[#33cbcc]/50 shadow-2xl w-65 rotate-2 ${getDifficultyBorder(task.difficulty)}`}>
        <div className="mb-2">
            <h3 className="text-sm font-bold text-gray-800 truncate">{task.title}</h3>
            {task.projectName && <p className="text-xs text-gray-400 mt-0.5 truncate">{task.projectName}</p>}
        </div>
        {task.description && <p className="text-xs text-gray-500 line-clamp-2">{task.description}</p>}
    </div>
);

/* ─── Kanban Column (Droppable) ──────────────────────────── */

const KanbanColumn = ({
    status,
    tasks,
    isOver,
    canDrop,
    isDragging,
    onTaskClick,
}: {
    status: MappedStatus;
    tasks: MappedTask[];
    isOver: boolean;
    canDrop: boolean;
    isDragging: boolean;
    onTaskClick: (task: MappedTask) => void;
}) => {
    const { t } = useTranslation();
    const { setNodeRef } = useDroppable({ id: status });
    const col = COLUMN_COLORS[status];

    const statusIcons: Record<MappedStatus, React.ReactNode> = {
        todo: <ClipboardList size={16} />,
        in_progress: <Clock size={16} />,
        done: <CheckCircle size={16} />,
    };

    let dropClass = '';
    if (isDragging && isOver) {
        dropClass = canDrop ? `ring-2 ${col.dropRing}` : 'ring-2 ring-red-300 bg-red-50/30';
    }

    return (
        <div
            ref={setNodeRef}
            className={`flex flex-col rounded-2xl bg-gray-50/80 border border-gray-100 min-h-100 transition-all duration-200 ${dropClass}`}
        >
            {/* Column header */}
            <div className={`flex items-center justify-between px-4 py-3 rounded-t-2xl ${col.headerBg}`}>
                <div className="flex items-center gap-2">
                    <span className={col.headerText}>{statusIcons[status]}</span>
                    <h3 className={`text-sm font-bold ${col.headerText}`}>
                        {t(`tasks.status.${status}`)}
                    </h3>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${col.headerBg} ${col.headerText}`}>
                    {tasks.length}
                </span>
            </div>

            {/* Card list */}
            <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-350px)]">
                {tasks.length === 0 ? (
                    <div className="flex items-center justify-center h-24 text-gray-300 text-sm">
                        {t('tasks.kanban.emptyColumn')}
                    </div>
                ) : (
                    tasks.map((task) => (
                        <KanbanCard
                            key={task.id}
                            task={task}
                            onClick={() => onTaskClick(task)}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

/* ─── Task Detail Modal ──────────────────────────────────── */

const NEXT_STATE: Partial<Record<TaskState, TaskState>> = {
    CREATED: 'IN_PROGRESS',
    ASSIGNED: 'IN_PROGRESS',
    IN_PROGRESS: 'COMPLETED',
    BLOCKED: 'IN_PROGRESS',
};

const TaskDetailModal = ({
    task,
    onClose,
    onUpdateState,
    onBlockTask,
    isUpdating,
}: {
    task: MappedTask;
    onClose: () => void;
    onUpdateState: (taskId: string, state: TaskState) => void;
    onBlockTask: (taskId: string, reason: string) => void;
    isUpdating: boolean;
}) => {
    const { t } = useTranslation();
    const nextState = NEXT_STATE[task.state];
    const [showBlockForm, setShowBlockForm] = useState(false);
    const [blockReason, setBlockReason] = useState('');
    const [blockError, setBlockError] = useState(false);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (showBlockForm) {
                    setShowBlockForm(false);
                    setBlockReason('');
                    setBlockError(false);
                } else {
                    onClose();
                }
            }
        };
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKey);
            document.body.style.overflow = '';
        };
    }, [onClose, showBlockForm]);

    const handleBlockSubmit = () => {
        if (!blockReason.trim()) {
            setBlockError(true);
            return;
        }
        onBlockTask(task.id, blockReason.trim());
    };

    const canBlock = task.state === 'IN_PROGRESS';

    const statusStyles: Record<MappedStatus, { cls: string; label: string }> = {
        todo: { cls: 'bg-[#283852]/10 text-[#283852]', label: t('tasks.status.todo') },
        in_progress: { cls: 'bg-[#33cbcc]/10 text-[#33cbcc]', label: t('tasks.status.in_progress') },
        done: { cls: 'bg-gray-100 text-gray-500', label: t('tasks.status.done') },
    };
    const st = statusStyles[task.status];

    const dotColor = task.state === 'BLOCKED' ? '#ef4444' : task.difficulty === 'EASY' ? '#33cbcc' : '#283852';

    const duration =
        task.startDate && task.endDate
            ? diffDays(new Date(task.startDate), new Date(task.endDate)) + 1
            : null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                <div className="h-1.5" style={{ backgroundColor: dotColor }} />

                <div className="p-6 space-y-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                                <h3 className="text-lg font-bold text-gray-800 truncate">{task.title}</h3>
                            </div>
                            {task.projectName && (
                                <p className="text-sm text-gray-500 pl-5">{task.projectName}</p>
                            )}
                        </div>
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {task.startDate && (
                            <div className="bg-gray-50 rounded-xl p-3">
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{t('tasks.detail.startDate')}</p>
                                <p className="text-sm font-semibold text-gray-800">{fmtDate(task.startDate)}</p>
                            </div>
                        )}
                        {task.endDate && (
                            <div className="bg-gray-50 rounded-xl p-3">
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{t('tasks.detail.endDate')}</p>
                                <p className="text-sm font-semibold text-gray-800">{fmtDate(task.endDate)}</p>
                            </div>
                        )}
                        {duration !== null && (
                            <div className="bg-gray-50 rounded-xl p-3">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <Clock size={11} className="text-gray-400" />
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('tasks.detail.duration')}</p>
                                </div>
                                <p className="text-sm font-semibold text-gray-800">
                                    {duration} {duration === 1 ? t('tasks.detail.day') : t('tasks.detail.days')}
                                </p>
                            </div>
                        )}
                        <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{t('tasks.table.status')}</p>
                            <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${task.state === 'BLOCKED' ? 'bg-red-100 text-red-600' : st.cls}`}>
                                {task.state === 'BLOCKED' ? t('dashboard.taskStatus.blocked') : st.label}
                            </span>
                        </div>
                    </div>

                    {/* Block reason display */}
                    {task.state === 'BLOCKED' && task.blockReason && (
                        <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                            <div className="flex items-center gap-1.5 mb-1">
                                <Ban size={11} className="text-red-400" />
                                <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">{t('tasks.block.blockedReason')}</p>
                            </div>
                            <p className="text-sm text-red-600">{task.blockReason}</p>
                        </div>
                    )}

                    {task.description && (
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('tasks.detail.description')}</p>
                            <p className="text-sm text-gray-600 leading-relaxed">{task.description}</p>
                        </div>
                    )}

                    {task.projectName && (
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('tasks.detail.project')}</p>
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                                <Briefcase size={14} className="text-[#283852]" />
                                <span className="font-medium">{task.projectName}</span>
                            </div>
                        </div>
                    )}

                    {/* Block reason form */}
                    {showBlockForm && (
                        <div className="space-y-3">
                            <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">{t('tasks.block.reasonLabel')}</p>
                            <textarea
                                value={blockReason}
                                onChange={(e) => { setBlockReason(e.target.value); setBlockError(false); }}
                                placeholder={t('tasks.block.reasonPlaceholder')}
                                className={`w-full rounded-xl border ${blockError ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-200'} p-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 resize-none`}
                                rows={3}
                                autoFocus
                            />
                            {blockError && (
                                <p className="text-xs text-red-500">{t('tasks.block.reasonRequired')}</p>
                            )}
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => { setShowBlockForm(false); setBlockReason(''); setBlockError(false); }}
                                    className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                                >
                                    {t('tasks.block.cancel')}
                                </button>
                                <button
                                    onClick={handleBlockSubmit}
                                    disabled={isUpdating}
                                    className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center gap-2"
                                >
                                    {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                                    {t('tasks.block.confirm')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {!showBlockForm && (
                    <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                        <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                            {t('tasks.detail.close')}
                        </button>
                        {canBlock && (
                            <button
                                onClick={() => setShowBlockForm(true)}
                                className="px-5 py-2.5 rounded-xl text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors flex items-center gap-2"
                            >
                                <Ban size={14} />
                                {t('tasks.actions.markBlocked')}
                            </button>
                        )}
                        {nextState && (
                            <button
                                onClick={() => onUpdateState(task.id, nextState)}
                                disabled={isUpdating}
                                className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-[#283852] hover:bg-[#1e2d42] disabled:opacity-50 transition-colors flex items-center gap-2"
                            >
                                {isUpdating ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : nextState === 'IN_PROGRESS' ? (
                                    <Play size={14} />
                                ) : (
                                    <CheckCircle size={14} />
                                )}
                                {nextState === 'IN_PROGRESS'
                                    ? (task.state === 'BLOCKED' ? t('tasks.actions.resumeProgress') : t('tasks.actions.startProgress'))
                                    : t('tasks.actions.markCompleted')}
                            </button>
                        )}
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};

/* ═══════════════════════════════════════════════════════════ */
/*  Main Component                                           */
/* ═══════════════════════════════════════════════════════════ */

const Tasks = () => {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<MappedStatus | 'all'>('all');
    const [dateFilter, setDateFilter] = useState<DateFilterKey>('all');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [showCustomPicker, setShowCustomPicker] = useState(false);
    const customPickerRef = useRef<HTMLDivElement>(null);
    const [selectedTask, setSelectedTask] = useState<MappedTask | null>(null);
    const [activeDragTask, setActiveDragTask] = useState<MappedTask | null>(null);
    const [overColumnId, setOverColumnId] = useState<MappedStatus | null>(null);
    const [gamificationData, setGamificationData] = useState<GamificationResult | null>(null);
    const [showPointsModal, setShowPointsModal] = useState(false);
    const [showBadgeModal, setShowBadgeModal] = useState(false);

    /* ── API data ── */
    const { data: apiTasks, isLoading } = useMyTasks();
    const updateTaskState = useUpdateTaskState();

    /* ── Sensors ── */
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor),
    );

    /* ── Map API tasks ── */
    const tasks: MappedTask[] = useMemo(
        () =>
            (apiTasks || []).map((t: Task) => ({
                id: t.id,
                title: t.title,
                description: t.description || '',
                status: STATE_TO_STATUS[t.state] || 'todo',
                state: t.state,
                difficulty: t.difficulty || 'MEDIUM',
                startDate: t.startDate || '',
                endDate: t.endDate || '',
                dueDate: t.dueDate || '',
                projectName: t.project?.name || '',
                projectId: t.projectId || '',
                blockReason: t.blockReason || '',
            })),
        [apiTasks],
    );

    /* ── Filtering (search + date) ── */
    const filteredTasks = useMemo(() =>
        tasks.filter((task) => {
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                if (
                    !task.title.toLowerCase().includes(q) &&
                    !task.projectName.toLowerCase().includes(q) &&
                    !task.description.toLowerCase().includes(q)
                ) return false;
            }
            if (!taskMatchesDateFilter(task, dateFilter, customFrom, customTo)) return false;
            return true;
        }),
        [tasks, searchQuery, dateFilter, customFrom, customTo],
    );

    /* ── Group by column ── */
    const tasksByColumn = useMemo(() => {
        const grouped: Record<MappedStatus, MappedTask[]> = { todo: [], in_progress: [], done: [] };
        filteredTasks.forEach((task) => grouped[task.status].push(task));
        return grouped;
    }, [filteredTasks]);

    /* ── Visible columns ── */
    const visibleColumns = filterStatus === 'all'
        ? COLUMNS
        : COLUMNS.filter((c) => c === filterStatus);

    /* ── DnD handlers ── */
    const handleDragStart = useCallback((event: DragStartEvent) => {
        const task = event.active.data.current?.task as MappedTask | undefined;
        if (task) {
            setActiveDragTask(task);
            setSelectedTask(null);
        }
    }, []);

    const handleDragOver = useCallback((event: DragOverEvent) => {
        const overId = event.over?.id as MappedStatus | undefined;
        setOverColumnId(overId && COLUMNS.includes(overId) ? overId : null);
    }, []);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragTask(null);
        setOverColumnId(null);

        if (!over) return;
        const task = active.data.current?.task as MappedTask;
        const targetColumn = over.id as MappedStatus;

        if (!task || !COLUMNS.includes(targetColumn)) return;
        if (task.status === targetColumn) return;
        if (!canTransition(task.status, targetColumn)) return;

        const newState = DROP_TARGET_STATE[targetColumn];
        updateTaskState.mutate(
            { taskId: task.id, state: newState },
            {
                onSuccess: (data) => {
                    if (data.gamification) {
                        setGamificationData(data.gamification);
                        setShowPointsModal(true);
                    }
                },
            },
        );
    }, [updateTaskState]);

    const handleDragCancel = useCallback(() => {
        setActiveDragTask(null);
        setOverColumnId(null);
    }, []);

    /* ── Loading state ── */
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-[#33cbcc]" />
            </div>
        );
    }

    /* ── Stats ── */
    const stats = [
        { label: t('tasks.stats.total'), value: tasks.length, icon: ClipboardList, color: '#283852' },
        { label: t('tasks.stats.inProgress'), value: tasks.filter((t) => t.status === 'in_progress').length, icon: Clock, color: '#33cbcc' },
        { label: t('tasks.stats.completed'), value: tasks.filter((t) => t.status === 'done').length, icon: CheckCircle, color: '#283852' },
        { label: t('tasks.stats.overdue'), value: tasks.filter((t) => isOverdue(t)).length, icon: AlertCircle, color: '#33cbcc' },
    ];

    /* ── Status filters ── */
    const statusFilters: { key: MappedStatus | 'all'; label: string }[] = [
        { key: 'all', label: t('tasks.filterAll') },
        { key: 'todo', label: t('tasks.status.todo') },
        { key: 'in_progress', label: t('tasks.status.in_progress') },
        { key: 'done', label: t('tasks.status.done') },
    ];

    /* ════════════════════════ JSX ════════════════════════ */

    return (
        <div className="space-y-6 md:space-y-8">
            {/* ═══ Page header ═══ */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{t('tasks.title')}</h1>
                <p className="text-gray-500 mt-1">{t('tasks.subtitle')}</p>
            </div>

            {/* ═══ Stats ═══ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white p-5 md:p-6 rounded-2xl border border-gray-100 relative overflow-hidden group hover:border-[#33cbcc]/50 transition-colors"
                    >
                        <div className="relative z-10">
                            <h3 className="text-gray-500 text-xs md:text-sm font-medium">{stat.label}</h3>
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mt-2">{stat.value}</h2>
                        </div>
                        <div
                            className="absolute -right-4 -bottom-4 opacity-5 transition-transform group-hover:scale-110 duration-500 ease-out"
                            style={{ color: stat.color }}
                        >
                            <stat.icon size={80} strokeWidth={1.5} />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* ═══ Search + Filters ═══ */}
            <div className="space-y-4">
                <div className="bg-white rounded-2xl p-2 flex items-center border border-gray-100 shadow-sm focus-within:ring-2 focus-within:ring-[#33cbcc]/20 transition-shadow">
                    <Search className="text-gray-400 ml-3" size={20} />
                    <input
                        type="text"
                        placeholder={t('tasks.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-gray-700 placeholder-gray-400 px-3 text-sm"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="mr-2 text-gray-400 hover:text-gray-600 transition-colors">
                            <X size={16} />
                        </button>
                    )}
                </div>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    {/* Status filters — left */}
                    <div className="flex gap-2 flex-wrap">
                        {statusFilters.map((sf) => (
                            <button
                                key={sf.key}
                                onClick={() => setFilterStatus(sf.key)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                                    filterStatus === sf.key
                                        ? 'bg-[#283852] text-white'
                                        : 'bg-white text-gray-600 border border-gray-100 hover:border-[#33cbcc]/30'
                                }`}
                            >
                                {sf.label}
                            </button>
                        ))}
                    </div>

                    {/* Date filters — right */}
                    <div className="flex gap-2 flex-wrap items-center">
                        <CalendarDays size={14} className="text-gray-400" />
                        {([
                            { key: 'all' as DateFilterKey, label: t('tasks.dateFilter.all') },
                            { key: 'today' as DateFilterKey, label: t('tasks.dateFilter.today') },
                            { key: 'week' as DateFilterKey, label: t('tasks.dateFilter.thisWeek') },
                            { key: 'month' as DateFilterKey, label: t('tasks.dateFilter.thisMonth') },
                            { key: 'custom' as DateFilterKey, label: t('tasks.dateFilter.custom') },
                        ]).map((df) => (
                            <button
                                key={df.key}
                                onClick={() => {
                                    setDateFilter(df.key);
                                    if (df.key === 'custom') {
                                        setShowCustomPicker(true);
                                    } else {
                                        setShowCustomPicker(false);
                                        setCustomFrom('');
                                        setCustomTo('');
                                    }
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                    dateFilter === df.key
                                        ? 'bg-[#33cbcc] text-white'
                                        : 'bg-white text-gray-500 border border-gray-100 hover:border-[#33cbcc]/30'
                                }`}
                            >
                                {df.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Custom date picker — full width below */}
                {showCustomPicker && dateFilter === 'custom' && (
                    <div ref={customPickerRef} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 w-fit ml-auto">
                        <input
                            type="date"
                            value={customFrom}
                            onChange={(e) => setCustomFrom(e.target.value)}
                            className="text-xs text-gray-700 border-none bg-transparent focus:outline-none focus:ring-0"
                        />
                        <span className="text-xs text-gray-400">→</span>
                        <input
                            type="date"
                            value={customTo}
                            onChange={(e) => setCustomTo(e.target.value)}
                            className="text-xs text-gray-700 border-none bg-transparent focus:outline-none focus:ring-0"
                        />
                        {(customFrom || customTo) && (
                            <button
                                onClick={() => { setCustomFrom(''); setCustomTo(''); }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ═══ Kanban Board ═══ */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
            >
                <div className={`grid gap-4 md:gap-5 ${
                    visibleColumns.length === 1
                        ? 'grid-cols-1 max-w-lg mx-auto'
                        : 'grid-cols-1 md:grid-cols-3'
                }`}>
                    {visibleColumns.map((status) => (
                        <KanbanColumn
                            key={status}
                            status={status}
                            tasks={tasksByColumn[status]}
                            isOver={overColumnId === status}
                            canDrop={activeDragTask ? canTransition(activeDragTask.status, status) : false}
                            isDragging={!!activeDragTask}
                            onTaskClick={(task) => setSelectedTask(task)}
                        />
                    ))}
                </div>

                <DragOverlay dropAnimation={{ duration: 200, easing: 'ease-out' }}>
                    {activeDragTask ? <DragOverlayCard task={activeDragTask} /> : null}
                </DragOverlay>
            </DndContext>

            {/* ═══ Task Detail Modal ═══ */}
            <AnimatePresence>
                {selectedTask && (
                    <TaskDetailModal
                        task={selectedTask}
                        onClose={() => setSelectedTask(null)}
                        isUpdating={updateTaskState.isPending}
                        onUpdateState={(taskId, state) => {
                            updateTaskState.mutate(
                                { taskId, state },
                                {
                                    onSuccess: (data) => {
                                        setSelectedTask(null);
                                        if (data.gamification) {
                                            setGamificationData(data.gamification);
                                            setShowPointsModal(true);
                                        }
                                    },
                                },
                            );
                        }}
                        onBlockTask={(taskId, reason) => {
                            updateTaskState.mutate(
                                { taskId, state: 'BLOCKED', blockReason: reason },
                                { onSuccess: () => setSelectedTask(null) },
                            );
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Gamification Modals */}
            <AnimatePresence>
                {showPointsModal && gamificationData && (
                    <PointsEarnedModal
                        pointsEarned={gamificationData.pointsEarned}
                        totalPoints={gamificationData.totalPoints}
                        onClose={() => {
                            setShowPointsModal(false);
                            if (gamificationData.newBadge) {
                                setTimeout(() => setShowBadgeModal(true), 300);
                            } else {
                                setGamificationData(null);
                            }
                        }}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showBadgeModal && gamificationData?.newBadge && (
                    <BadgeEarnedModal
                        badgeNumber={gamificationData.newBadge.badgeNumber}
                        title={gamificationData.newBadge.title}
                        milestone={gamificationData.newBadge.milestone}
                        onClose={() => {
                            setShowBadgeModal(false);
                            setGamificationData(null);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Tasks;
