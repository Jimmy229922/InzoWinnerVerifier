import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import './Dashboard.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faCheckCircle, 
    faTimesCircle, 
    faFilter, 
    faListAlt,
    faPlus,
    faEye,
    faTrash,
    faRefresh,
    faUpload,
    faCalendarAlt,
    faSearch,
    faSortUp,
    faSortDown,
    faSort,
    faUsers,
    faClipboardCheck,
    faGlobe,
    faChartLine,
    faClock,
    faExclamationTriangle,
    faBell
} from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function Dashboard({ 
    onStartNewVerification, 
    onViewVerification, 
    searchQuery, 
    filterStatus, 
    filterPublished, 
    searchFields, 
    searchTrigger, 
    onOpenFilterModal, 
    filterDueDate, 
    onViewPublishedClients 
}) {
    const [verifications, setVerifications] = useState([]);
    const [dashboardStats, setDashboardStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [selectedRecords, setSelectedRecords] = useState([]);
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [localSearchQuery, setLocalSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [refreshInterval, setRefreshInterval] = useState(10);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [dueDateAlerts, setDueDateAlerts] = useState([]);
    const [totalRecordsCount, setTotalRecordsCount] = useState(0);

    const fetchDashboardStats = useCallback(async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/dashboard-stats`);
            setDashboardStats(response.data);
            if (response.data.due_date_alerts) {
                setDueDateAlerts(response.data.due_date_alerts);
            }
        } catch (err) {
            console.error('Error fetching dashboard stats:', err);
            setNotifications(prev => [...prev, {
                id: Date.now(),
                type: 'error',
                message: 'فشل في تحميل إحصائيات لوحة التحكم'
            }]);
        }
    }, []);

    const fetchVerifications = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                query: searchQuery,
                status: filterStatus,
                published: filterPublished === 'الكل' ? '' : filterPublished,
                search_fields: searchFields.join(','),
                prize_due_date: filterDueDate,
                page: currentPage,
                limit: itemsPerPage,
                sort_by: sortConfig.key,
                sort_direction: sortConfig.direction
            };
            
            const response = await axios.get(`${API_BASE_URL}/verifications`, { params });
            const recordsToSet = Array.isArray(response.data.records) ? response.data.records : [];

            const recordsWithDefault = recordsToSet.map(record => ({ 
                ...record,
                prize_published_on_group: record.prize_published_on_group === undefined ? false : record.prize_published_on_group,
                prize_due_date: record.prize_due_date || ''
            }));
            
            setVerifications(recordsWithDefault);
            setTotalRecordsCount(response.data.total_count || 0);
        } catch (err) {
            const errorMessage = 'فشل في تحميل سجلات التحقق. يرجى التأكد من أن الخادم الخلفي (Backend) يعمل.';
            setError(errorMessage);
            setNotifications(prev => [...prev, {
                id: Date.now(),
                type: 'error',
                message: errorMessage
            }]);
            console.error('Error fetching verifications:', err);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, filterStatus, filterPublished, searchFields, filterDueDate, currentPage, itemsPerPage, sortConfig]);

    const handleDeleteVerification = useCallback(async (recordId, isBulk = false) => {
        const recordsToDelete = isBulk ? selectedRecords : [recordId];
        const confirmMessage = isBulk 
            ? `هل أنت متأكد من رغبتك في حذف ${recordsToDelete.length} سجل بشكل دائم؟`
            : 'هل أنت متأكد من رغبتك في حذف هذا السجل بشكل دائم؟';
        
        const confirmed = window.confirm(confirmMessage);
        if (!confirmed) return;

        try {
            if (isBulk) {
                for (const id of recordsToDelete) {
                    await axios.delete(`${API_BASE_URL}/verifications/${id}`);
                }
                setNotifications(prev => [...prev, {
                    id: Date.now(),
                    type: 'success',
                    message: `تم حذف ${recordsToDelete.length} سجل بنجاح!`
                }]);
                setSelectedRecords([]);
                setShowBulkActions(false);
            } else {
                await axios.delete(`${API_BASE_URL}/verifications/${recordId}`);
                setNotifications(prev => [...prev, {
                    id: Date.now(),
                    type: 'success',
                    message: 'تم حذف السجل بنجاح!'
                }]);
            }
            
            fetchDashboardStats();
            fetchVerifications();
        } catch (err) {
            const errorMessage = 'فشل في حذف السجل.';
            setError(errorMessage);
            setNotifications(prev => [...prev, {
                id: Date.now(),
                type: 'error',
                message: errorMessage
            }]);
            console.error('Error deleting verification:', err);
        }
    }, [selectedRecords, fetchDashboardStats, fetchVerifications]);

    const handleTogglePublishedStatus = useCallback(async (recordId, currentStatus, recordStatus) => {
        if (recordStatus !== 'مكتمل') {
            setNotifications(prev => [...prev, {
                id: Date.now(),
                type: 'warning',
                message: 'لا يمكن تغيير حالة النشر إلا بعد اكتمال الفحص.'
            }]);
            return;
        }

        const newStatus = !currentStatus;
        const confirmMessage = newStatus 
            ? 'هل أنت متأكد من وضع علامة "تم النشر" لهذا السجل؟' 
            : 'هل أنت متأكد من إزالة علامة "تم النشر" لهذا السجل؟';
        
        const confirmed = window.confirm(confirmMessage);
        if (!confirmed) return;

        try {
            await axios.put(`${API_BASE_URL}/verifications/${recordId}`, { 
                prize_published_on_group: newStatus 
            });
            
            setNotifications(prev => [...prev, {
                id: Date.now(),
                type: 'success',
                message: 'تم تحديث حالة النشر بنجاح!'
            }]);
            
            fetchDashboardStats();
            fetchVerifications();
        } catch (err) {
            const errorMessage = 'فشل في تحديث حالة النشر. يرجى المحاولة مرة أخرى.';
            setError(errorMessage);
            setNotifications(prev => [...prev, {
                id: Date.now(),
                type: 'error',
                message: errorMessage
            }]);
            console.error('Error updating verification status:', err);
        }
    }, [fetchDashboardStats, fetchVerifications]);

    const handleSort = useCallback((key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    }, [sortConfig]);

    const handleSelectRecord = useCallback((recordId) => {
        setSelectedRecords(prev => {
            const newSelection = prev.includes(recordId)
                ? prev.filter(id => id !== recordId)
                : [...prev, recordId];
            setShowBulkActions(newSelection.length > 0);
            return newSelection;
        });
    }, []);

    const handleSelectAll = useCallback(() => {
        const allIds = verifications.map(record => record.id);
        const allSelected = selectedRecords.length === allIds.length && allIds.length > 0;
        setSelectedRecords(allSelected ? [] : allIds);
        setShowBulkActions(!allSelected && allIds.length > 0);
    }, [verifications, selectedRecords]);

    const removeNotification = useCallback((notificationId) => {
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    }, []);

    const filteredAndSortedData = useMemo(() => {
        let filtered = verifications;
        
        if (localSearchQuery) {
            filtered = filtered.filter(record => 
                Object.values(record).some(value => 
                    String(value).toLowerCase().includes(localSearchQuery.toLowerCase())
                )
            );
        }

        if (sortConfig.key) {
            filtered = [...filtered].sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (aValue === null || aValue === undefined) return sortConfig.direction === 'asc' ? 1 : -1;
                if (bValue === null || bValue === undefined) return sortConfig.direction === 'asc' ? -1 : 1;

                if (sortConfig.key === 'prize_due_date' || sortConfig.key === 'updated_at') {
                    const dateA = new Date(aValue);
                    const dateB = new Date(bValue);
                    return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
                } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                    return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
                } else {
                    return String(aValue).localeCompare(String(bValue), 'ar', { sensitivity: 'base' });
                }
            });
        }
        
        return filtered;
    }, [verifications, localSearchQuery, sortConfig]);

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredAndSortedData.slice(startIndex, endIndex);
    }, [filteredAndSortedData, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);

    useEffect(() => {
        if (!autoRefresh) return;
        
        const interval = setInterval(() => {
            fetchVerifications();
            fetchDashboardStats();
        }, refreshInterval * 60 * 1000);
        
        return () => clearInterval(interval);
    }, [autoRefresh, refreshInterval, fetchVerifications, fetchDashboardStats]);

    useEffect(() => {
        fetchVerifications();
        fetchDashboardStats();
    }, [searchTrigger, fetchVerifications, fetchDashboardStats]);

    useEffect(() => {
        notifications.forEach(notification => {
            if (notification.type !== 'error') {
                setTimeout(() => {
                    removeNotification(notification.id);
                }, 5000);
            }
        });
    }, [notifications, removeNotification]);

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return faSort;
        return sortConfig.direction === 'asc' ? faSortUp : faSortDown;
    };

    if (loading && !dashboardStats) {
        return (
            <div className="dashboard-container loading-state">
                <div className="loading-spinner"></div>
                <p>جاري تحميل البيانات...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-container error-state">
                <FontAwesomeIcon icon={faExclamationTriangle} className="error-icon" />
                <h3>خطأ في التحميل</h3>
                <p>{error}</p>
                <button onClick={() => window.location.reload()} className="retry-button">
                    <FontAwesomeIcon icon={faRefresh} /> إعادة المحاولة
                </button>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            {notifications.length > 0 && (
                <div className="notifications-container">
                    {notifications.map(notification => (
                        <div key={notification.id} className={`notification notification-${notification.type}`}>
                            <FontAwesomeIcon icon={faBell} className="notification-icon" />
                            <span>{notification.message}</span>
                            <button onClick={() => removeNotification(notification.id)} className="notification-close-button">×</button>
                        </div>
                    ))}
                </div>
            )}

            {dueDateAlerts.length > 0 && (
                <div className="due-date-alerts">
                    <FontAwesomeIcon icon={faCalendarAlt} className="alert-icon" />
                    <span>تنبيه: {dueDateAlerts.length} سجل يستحق المتابعة قريباً.</span>
                </div>
            )}

            <div className="toolbar">
                <div className="toolbar-left">
                    <button className="btn btn-primary" onClick={onOpenFilterModal}>
                        <FontAwesomeIcon icon={faFilter} className="icon" /> تصفية الفائزين
                    </button>
                    <button className="btn btn-secondary" onClick={onViewPublishedClients}>
                        <FontAwesomeIcon icon={faListAlt} className="icon" /> عرض العملاء المنشورين
                    </button>
                </div>
                
                <div className="toolbar-right">
                    <div className="auto-refresh-control">
                        <label>
                            <input 
                                type="checkbox" 
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                            />
                            تحديث تلقائي كل
                        </label>
                        <select 
                            value={refreshInterval} 
                            onChange={(e) => setRefreshInterval(Number(e.target.value))}
                            disabled={!autoRefresh}
                        >
                            <option value={5}>5 دقائق</option>
                            <option value={10}>10 دقائق</option>
                            <option value={30}>30 دقيقة</option>
                            <option value={60}>ساعة</option>
                        </select>
                    </div>
                    <button className="btn btn-secondary" onClick={() => {
                        fetchVerifications();
                        fetchDashboardStats();
                        setNotifications(prev => [...prev, {
                            id: Date.now(),
                            type: 'info',
                            message: 'تم تحديث البيانات يدوياً.'
                        }]);
                    }}>
                        <FontAwesomeIcon icon={faRefresh} className="icon" /> تحديث
                    </button>
                </div>
            </div>

            <div className="table-section">
                <div className="table-header">
                    <h2 className="section-title">قائمة جميع سجلات الفحص</h2>
                    <div className="table-controls">
                        <div className="search-box">
                            <input
                                type="text"
                                placeholder="البحث في الجدول..."
                                value={localSearchQuery}
                                onChange={(e) => setLocalSearchQuery(e.target.value)}
                                className="local-search-input"
                            />
                            <FontAwesomeIcon icon={faSearch} className="search-icon" />
                        </div>
                        <button 
                            className="btn btn-success"
                            onClick={onStartNewVerification}
                        >
                            <FontAwesomeIcon icon={faPlus} className="icon" />
                            فحص فائز جديد
                        </button>
                    </div>
                </div>

                {selectedRecords.length > 0 && (
                    <div className="bulk-actions">
                        <span>تم اختيار {selectedRecords.length} عنصر</span>
                        <button 
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteVerification(null, true)}
                        >
                            <FontAwesomeIcon icon={faTrash} /> حذف المحدد
                        </button>
                        <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                                setSelectedRecords([]);
                            }}
                        >
                            إلغاء التحديد
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p className="loading-message-initial">جاري تحميل السجلات...</p>
                    </div>
                ) : (
                    paginatedData.length === 0 ? (
                        <div className="no-data-container">
                            <FontAwesomeIcon icon={faUsers} className="no-data-icon" />
                            <p className="no-data-message">لا يوجد سجلات فحص مطابقة.</p>
                        </div>
                    ) : (
                        <>
                            <div className="table-container">
                                <table className="verification-table">
                                    <thead>
                                        <tr>
                                            <th className="th checkbox-column">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRecords.length === verifications.length && verifications.length > 0}
                                                    onChange={() => handleSelectAll()}
                                                    className="custom-checkbox"
                                                />
                                            </th>
                                            <th className="th sortable" onClick={() => handleSort('client_name')}>
                                                الاسم 
                                                <FontAwesomeIcon icon={getSortIcon('client_name')} className="sort-icon" />
                                            </th>
                                            <th className="th sortable" onClick={() => handleSort('email')}>
                                                الايميل
                                                <FontAwesomeIcon icon={getSortIcon('email')} className="sort-icon" />
                                            </th>
                                            <th className="th sortable" onClick={() => handleSort('agency_id')}>
                                                رقم الوكالة
                                                <FontAwesomeIcon icon={getSortIcon('agency_id')} className="sort-icon" />
                                            </th>
                                            <th className="th sortable" onClick={() => handleSort('account_number')}>
                                                رقم الحساب
                                                <FontAwesomeIcon icon={getSortIcon('account_number')} className="sort-icon" />
                                            </th>
                                            <th className="th sortable" onClick={() => handleSort('status')}>
                                                الحالة
                                                <FontAwesomeIcon icon={getSortIcon('status')} className="sort-icon" />
                                            </th>
                                            <th className="th sortable" onClick={() => handleSort('prize_due_date')}>
                                                تاريخ الاستحقاق
                                                <FontAwesomeIcon icon={getSortIcon('prize_due_date')} className="sort-icon" />
                                            </th>
                                            <th className="th sortable" onClick={() => handleSort('updated_at')}>
                                                آخر تحديث
                                                <FontAwesomeIcon icon={getSortIcon('updated_at')} className="sort-icon" />
                                            </th>
                                            <th className="th actions-header">الإجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedData.map((record) => (
                                            <tr key={record.id} className={selectedRecords.includes(record.id) ? 'selected' : ''}>
                                                <td className="td">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRecords.includes(record.id)}
                                                        onChange={() => handleSelectRecord(record.id)}
                                                        className="custom-checkbox"
                                                    />
                                                </td>
                                                <td className="td">{record.client_name || 'غير محدد'}</td>
                                                <td className="td">{record.email || 'غير محدد'}</td>
                                                <td className="td">{record.agency_id || 'غير محدد'}</td>
                                                <td className="td">{record.account_number || 'غير محدد'}</td>
                                                <td className="td">
                                                    <span className={`status-badge status-${record.status?.replace(/\s+/g, '-').toLowerCase()}`}>
                                                        {record.status}
                                                    </span>
                                                </td>
                                                <td className="td">
                                                    {record.prize_due_date ? (
                                                        <span className={`due-date ${new Date(record.prize_due_date) < new Date() ? 'overdue' : ''}`}>
                                                            {new Date(record.prize_due_date).toLocaleDateString('ar-EG')}
                                                        </span>
                                                    ) : 'غير محدد'}
                                                </td>
                                                <td className="td">
                                                    {record.updated_at ? (
                                                        <span className="update-time">
                                                            {new Date(record.updated_at).toLocaleString('ar-EG', { 
                                                                dateStyle: 'short', 
                                                                timeStyle: 'short' 
                                                            })}
                                                        </span>
                                                    ) : 'غير محدد'}
                                                </td>
                                                <td className="td actions-cell">
                                                    {record.status !== 'مكتمل' || !record.prize_published_on_group ? (
                                                        <div className="action-buttons">
                                                            <button 
                                                                className="btn btn-info btn-sm"
                                                                onClick={() => onViewVerification(record.id)}
                                                                title="متابعة الفحص"
                                                            >
                                                                <FontAwesomeIcon icon={faEye} />
                                                            </button>
                                                            <button
                                                                className="btn btn-danger btn-sm"
                                                                onClick={() => handleDeleteVerification(record.id)}
                                                                title="حذف الملف"
                                                            >
                                                                <FontAwesomeIcon icon={faTrash} />
                                                            </button>
                                                            {record.status === 'مكتمل' && (
                                                                <button
                                                                    className="btn btn-success btn-sm"
                                                                    onClick={() => handleTogglePublishedStatus(record.id, record.prize_published_on_group, record.status)}
                                                                    title={record.prize_published_on_group ? 'إلغاء النشر' : 'نشر في الجروب'}
                                                                >
                                                                    <FontAwesomeIcon icon={record.prize_published_on_group ? faTimesCircle : faCheckCircle} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="action-completed-text">
                                                            <FontAwesomeIcon icon={faCheckCircle} className="completed-icon" />
                                                            تمت الإجراءات
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="pagination-container">
                                <div className="pagination-info">
                                    عرض {((currentPage - 1) * itemsPerPage) + 1} إلى {Math.min(currentPage * itemsPerPage, filteredAndSortedData.length)} من {totalRecordsCount} سجل
                                </div>
                                
                                <div className="pagination-controls">
                                    <select 
                                        value={itemsPerPage} 
                                        onChange={(e) => {
                                            setItemsPerPage(Number(e.target.value));
                                            setCurrentPage(1); 
                                        }}
                                        className="form-select" 
                                    >
                                        <option value={5}>5 لكل صفحة</option>
                                        <option value={10}>10 لكل صفحة</option>
                                        <option value={25}>25 لكل صفحة</option>
                                        <option value={50}>50 لكل صفحة</option>
                                    </select>
                                    
                                    <div className="pagination-buttons">
                                        <button 
                                            onClick={() => setCurrentPage(1)}
                                            disabled={currentPage === 1}
                                            className="btn btn-outline btn-sm" 
                                        >
                                            الأولى
                                        </button>
                                        <button 
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="btn btn-outline btn-sm"
                                        >
                                            السابقة
                                        </button>
                                        
                                        <span className="pagination-current">
                                            صفحة {currentPage} من {totalPages}
                                        </span>
                                        
                                        <button 
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            className="btn btn-outline btn-sm"
                                        >
                                            التالية
                                        </button>
                                        <button 
                                            onClick={() => setCurrentPage(totalPages)}
                                            disabled={currentPage === totalPages}
                                            className="btn btn-outline btn-sm"
                                        >
                                            الأخيرة
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )
                )}
            </div>

            <div className="section-separator">
                <div className="separator-line"></div>
                <div className="separator-text">الإحصائيات والتقارير</div>
                <div className="separator-line"></div>
            </div>

            <div className="summary-section">
                <h2 className="section-title">
                    <FontAwesomeIcon icon={faChartLine} className="section-title-icon" />
                    لوحة التحكم الرئيسية
                </h2>
                
                {dashboardStats ? (
                    <>
                        <div className="stats-container">
                            <div className="stat-card in-progress">
                                <div className="stat-icon">
                                    <FontAwesomeIcon icon={faClock} />
                                </div>
                                <div className="stat-content">
                                    <div className="stat-label">قيد التحقق</div>
                                    <p className="stat-value">{dashboardStats.in_progress_count || 0}</p>
                                    <span className="stat-change">
                                        {dashboardStats.in_progress_trend !== undefined ? `${dashboardStats.in_progress_trend > 0 ? '+' : ''}${dashboardStats.in_progress_trend}%` : 'N/A'}
                                    </span>
                                </div>
                            </div>

                            <div className="stat-card completed-today">
                                <div className="stat-icon">
                                    <FontAwesomeIcon icon={faClipboardCheck} />
                                </div>
                                <div className="stat-content">
                                    <div className="stat-label">تم التحقق منهم اليوم</div>
                                    <p className="stat-value">{dashboardStats.completed_today_count || 0}</p>
                                    <span className="stat-change positive">
                                        {dashboardStats.daily_completion_rate !== undefined ? `+${dashboardStats.daily_completion_rate}%` : 'N/A'}
                                    </span>
                                </div>
                            </div>

                            <div className="stat-card published-on-group">
                                <div className="stat-icon">
                                    <FontAwesomeIcon icon={faGlobe} />
                                </div>
                                <div className="stat-content">
                                    <div className="stat-label">تم النشر في الجروب</div>
                                    <p className="stat-value">{dashboardStats.prize_published_count || 0}</p>
                                    <span className="stat-change">
                                        {dashboardStats.publish_rate !== undefined ? `${dashboardStats.publish_rate}%` : 'N/A'}
                                    </span>
                                </div>
                            </div>

                            <div className="stat-card total-records">
                                <div className="stat-icon">
                                    <FontAwesomeIcon icon={faUsers} />
                                </div>
                                <div className="stat-content">
                                    <div className="stat-label">إجمالي السجلات</div>
                                    <p className="stat-value">{dashboardStats.total_records || 0}</p>
                                    <span className="stat-change">
                                        جميع الأوقات
                                    </span>
                                </div>
                            </div>
                        </div>

                        {dashboardStats.weekly_completion_chart && dashboardStats.weekly_completion_chart.length > 0 && (
                            <div className="chart-section">
                                <h3 className="section-title">
                                    <FontAwesomeIcon icon={faChartLine} className="section-title-icon" />
                                    الإنجاز خلال الأسبوع الماضي
                                </h3>
                                <div className="completion-chart">
                                    <p className="no-data-message-small">لا تتوفر بيانات للمخطط حالياً.</p>
                                </div>
                            </div>
                        )}

                        <div className="quick-actions">
                            <h3 className="section-title">
                                <FontAwesomeIcon icon={faListAlt} className="section-title-icon" />
                                المهام السريعة
                            </h3>
                            <div className="quick-actions-grid">
                                <button className="btn btn-primary" onClick={onStartNewVerification}>
                                    <FontAwesomeIcon icon={faPlus} />
                                    <span>فحص فائز جديد</span>
                                </button>
                                <button className="btn btn-info" onClick={onViewPublishedClients}>
                                    <FontAwesomeIcon icon={faGlobe} />
                                    <span>العملاء المنشورين</span>
                                </button>
                                <button className="btn btn-outline" onClick={onOpenFilterModal}>
                                    <FontAwesomeIcon icon={faFilter} />
                                    <span>تصفية متقدمة</span>
                                </button>
                                <button className="btn btn-outline" onClick={() => {
                                    fetchVerifications();
                                    fetchDashboardStats();
                                    setNotifications(prev => [...prev, {
                                        id: Date.now(),
                                        type: 'info',
                                        message: 'تم تحديث الصفحة يدوياً.'
                                    }]);
                                }}>
                                    <FontAwesomeIcon icon={faRefresh} />
                                    <span>تحديث الصفحة</span>
                                </button>
                                <button className="btn btn-outline">
                                    <FontAwesomeIcon icon={faUpload} />
                                    <span>نسخ احتياطي</span>
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="loading-container">
                        <div className="loading-spinner large"></div>
                        <p className="loading-message-initial">جاري تحميل إحصائيات لوحة التحكم...</p>
                    </div>
                )}
            </div>

            <div className="status-bar">
                <div className="status-left">
                    <span className="status-item">
                        <FontAwesomeIcon icon={faUsers} />
                        إجمالي السجلات: {totalRecordsCount}
                    </span>
                    <span className="status-item">
                        <FontAwesomeIcon icon={faFilter} />
                        المرشحة: {filteredAndSortedData.length}
                    </span>
                    {selectedRecords.length > 0 && (
                        <span className="status-item selected">
                            <FontAwesomeIcon icon={faCheckCircle} />
                            محدد: {selectedRecords.length}
                        </span>
                    )}
                </div>
                <div className="status-right">
                    <span className="status-item">
                        آخر تحديث: {new Date().toLocaleTimeString('ar-EG')}
                    </span>
                    {autoRefresh && (
                        <span className="status-item auto-refresh-indicator">
                            <FontAwesomeIcon icon={faRefresh} className="spinning" />
                            تحديث تلقائي نشط
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Dashboard;