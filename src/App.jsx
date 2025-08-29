import React, { useState, useEffect, useReducer, useMemo, useCallback } from 'react';
import { Search, Plus, Calendar, Clock, AlertCircle, CheckCircle2, Trash2, Edit3, BarChart3, TrendingUp } from 'lucide-react';

// Custom hooks
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
};

// Task reducer for state management
const taskReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_TASK':
      return [action.payload, ...state];
    case 'UPDATE_TASK':
      return state.map(task => 
        task.id === action.payload.id ? { ...task, ...action.payload.updates } : task
      );
    case 'DELETE_TASK':
      return state.filter(task => task.id !== action.payload);
    case 'TOGGLE_TASK':
      return state.map(task => 
        task.id === action.payload 
          ? { ...task, completed: !task.completed, completedAt: !task.completed ? new Date().toISOString() : null }
          : task
      );
    case 'SET_TASKS':
      return action.payload;
    default:
      return state;
  }
};

// Utility functions
const generateId = () => Date.now() + Math.random();

const isOverdue = (dueDate) => new Date(dueDate) < new Date().setHours(0, 0, 0, 0);

const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

const getPriorityColor = (priority) => {
  const colors = {
    high: 'bg-gradient-to-r from-red-500 to-red-600',
    medium: 'bg-gradient-to-r from-amber-500 to-orange-500',
    low: 'bg-gradient-to-r from-emerald-500 to-green-500'
  };
  return colors[priority] || colors.low;
};

// Components
const StatCard = ({ icon: Icon, title, value, color, trend }) => (
  <div className="bg-white rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-100">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        {trend && (
          <div className="flex items-center mt-1 text-sm">
            <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
            <span className="text-green-600 font-medium text-xs">{trend}</span>
          </div>
        )}
      </div>
      <div className={`p-2 rounded-lg ${getPriorityColor('low')}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
    </div>
  </div>
);

const TaskCard = ({ task, onToggle, onDelete, onEdit }) => {
  const overdue = !task.completed && isOverdue(task.dueDate);
  
  const priorityStyles = {
    high: 'border-l-red-500 bg-red-50',
    medium: 'border-l-amber-500 bg-amber-50',
    low: 'border-l-emerald-500 bg-emerald-50'
  };
  
  return (
    <div className={`bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200 border-l-4 ${
      task.completed ? 'opacity-75 bg-gray-50' : priorityStyles[task.priority]
    } ${overdue ? 'ring-2 ring-red-200' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className={`text-base font-semibold mb-2 break-words ${
            task.completed ? 'line-through text-gray-500' : 'text-gray-900'
          }`}>
            {task.text}
          </h3>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <div className="flex items-center">
              <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="text-xs">{formatDate(task.dueDate)}</span>
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              task.priority === 'high' ? 'bg-red-100 text-red-800' :
              task.priority === 'medium' ? 'bg-amber-100 text-amber-800' :
              'bg-emerald-100 text-emerald-800'
            }`}>
              {task.priority.toUpperCase()}
            </div>
            {overdue && (
              <div className="flex items-center text-red-600">
                <AlertCircle className="h-3 w-3 mr-1" />
                <span className="text-xs">Overdue</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={() => onToggle(task.id)}
            className={`p-1.5 rounded transition-colors ${
              task.completed 
                ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Toggle completion"
          >
            <CheckCircle2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onEdit(task)}
            className="p-1.5 rounded bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
            title="Edit task"
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1.5 rounded bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
            title="Delete task"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const TaskForm = ({ task, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    text: task?.text || '',
    priority: task?.priority || 'medium',
    dueDate: task?.dueDate || new Date().toISOString().split('T')[0],
    category: task?.category || 'work'
  });
  
  const [errors, setErrors] = useState({});
  
  const validateForm = () => {
    const newErrors = {};
    if (!formData.text.trim()) newErrors.text = 'Task description is required';
    if (!formData.dueDate) newErrors.dueDate = 'Due date is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
      if (!task) {
        setFormData({
          text: '',
          priority: 'medium',
          dueDate: new Date().toISOString().split('T')[0],
          category: 'work'
        });
        setErrors({});
      }
    }
  };
  
  return (
    <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
      <h2 className="text-lg font-bold mb-4 text-gray-900">
        {task ? 'Edit Task' : 'Create New Task'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Task Description *
          </label>
          <input
            type="text"
            value={formData.text}
            onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm ${
              errors.text ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter task description..."
            required
          />
          {errors.text && <p className="text-red-500 text-xs mt-1">{errors.text}</p>}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
                errors.dueDate ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {errors.dueDate && <p className="text-red-500 text-xs mt-1">{errors.dueDate}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="work">Work</option>
              <option value="personal">Personal</option>
              <option value="health">Health</option>
              <option value="education">Education</option>
            </select>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            type="submit"
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium flex items-center justify-center text-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            {task ? 'Update Task' : 'Create Task'}
          </button>
          {task && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

// Main App Component
const App = () => {
  const [tasks, dispatch] = useReducer(taskReducer, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFilter, setCurrentFilter] = useState('all');
  const [editingTask, setEditingTask] = useState(null);
  
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  // Initialize with demo data
  useEffect(() => {
    const demoTasks = [
      {
        id: generateId(),
        text: "Complete React internship project",
        priority: "high",
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        category: "work",
        completed: false,
        createdAt: new Date().toISOString()
      },
      {
        id: generateId(),
        text: "Learn advanced React patterns",
        priority: "medium",
        dueDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
        category: "education",
        completed: true,
        createdAt: new Date().toISOString()
      },
      {
        id: generateId(),
        text: "Set up development environment",
        priority: "high",
        dueDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        category: "work",
        completed: false,
        createdAt: new Date().toISOString()
      }
    ];
    dispatch({ type: 'SET_TASKS', payload: demoTasks });
  }, []);
  
  // Memoized computed values
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const pending = total - completed;
    const overdue = tasks.filter(task => !task.completed && isOverdue(task.dueDate)).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, pending, overdue, progress };
  }, [tasks]);
  
  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    
    // Apply search filter
    if (debouncedSearch) {
      filtered = filtered.filter(task =>
        task.text.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        task.category.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    }
    
    // Apply status/priority filter
    switch (currentFilter) {
      case 'pending':
        filtered = filtered.filter(task => !task.completed);
        break;
      case 'completed':
        filtered = filtered.filter(task => task.completed);
        break;
      case 'overdue':
        filtered = filtered.filter(task => !task.completed && isOverdue(task.dueDate));
        break;
      case 'high':
        filtered = filtered.filter(task => task.priority === 'high' && !task.completed);
        break;
    }
    
    return filtered.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed - b.completed;
      if (a.priority !== b.priority) {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
  }, [tasks, debouncedSearch, currentFilter]);
  
  // Event handlers
  const handleAddTask = useCallback((formData) => {
    const newTask = {
      id: generateId(),
      ...formData,
      completed: false,
      createdAt: new Date().toISOString()
    };
    dispatch({ type: 'ADD_TASK', payload: newTask });
  }, []);
  
  const handleUpdateTask = useCallback((formData) => {
    dispatch({ 
      type: 'UPDATE_TASK', 
      payload: { id: editingTask.id, updates: formData }
    });
    setEditingTask(null);
  }, [editingTask]);
  
  const handleToggleTask = useCallback((id) => {
    dispatch({ type: 'TOGGLE_TASK', payload: id });
  }, []);
  
  const handleDeleteTask = useCallback((id) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      dispatch({ type: 'DELETE_TASK', payload: id });
    }
  }, []);
  
  const filters = [
    { key: 'all', label: 'All', count: tasks.length },
    { key: 'pending', label: 'Pending', count: stats.pending },
    { key: 'completed', label: 'Completed', count: stats.completed },
    { key: 'overdue', label: 'Overdue', count: stats.overdue },
    { key: 'high', label: 'High Priority', count: tasks.filter(t => t.priority === 'high' && !t.completed).length }
  ];
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <div className="text-center sm:text-left mb-4 sm:mb-0">
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">TaskMaster Pro</h1>
              <p className="text-indigo-100 text-base sm:text-lg">Task Management Dashboard</p>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold">{stats.progress}%</div>
              <div className="text-sm opacity-90">Complete</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Stats Dashboard */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={BarChart3}
            title="Total Tasks"
            value={stats.total}
            color="text-blue-600"
            trend="+12%"
          />
          <StatCard
            icon={Clock}
            title="Pending"
            value={stats.pending}
            color="text-amber-600"
          />
          <StatCard
            icon={CheckCircle2}
            title="Completed"
            value={stats.completed}
            color="text-emerald-600"
          />
          <StatCard
            icon={AlertCircle}
            title="Overdue"
            value={stats.overdue}
            color="text-red-600"
          />
        </div>
        
        {/* Progress Bar */}
        <div className="bg-white rounded-lg p-4 mb-6 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-900">Overall Progress</h3>
            <span className="text-xs text-gray-500">{stats.completed} of {stats.total} completed</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-500"
              style={{ width: `${stats.progress}%` }}
            />
          </div>
        </div>
        
        {/* Task Form */}
        <div className="mb-6">
          <TaskForm
            task={editingTask}
            onSubmit={editingTask ? handleUpdateTask : handleAddTask}
            onCancel={() => setEditingTask(null)}
          />
        </div>
        
        {/* Search and Filters */}
        <div className="bg-white rounded-lg p-4 shadow-md mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2 w-full lg:w-auto justify-center">
              {filters.map(filter => (
                <button
                  key={filter.key}
                  onClick={() => setCurrentFilter(filter.key)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-200 text-xs ${
                    currentFilter === filter.key
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter.label} ({filter.count})
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Tasks List */}
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center shadow-md">
              <div className="text-4xl mb-3">📋</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {debouncedSearch ? 'No matching tasks found' : 'No tasks yet'}
              </h3>
              <p className="text-gray-600 text-sm">
                {debouncedSearch 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Create your first task to get started!'
                }
              </p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={handleToggleTask}
                onDelete={handleDeleteTask}
                onEdit={setEditingTask}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default App;