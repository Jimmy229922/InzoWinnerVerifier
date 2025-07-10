// frontend/src/components/Dashboard.js

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import './Dashboard.css'; // تأكد من استيراد ملف CSS المحدث
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
    faBell,
    faCircleInfo, // لأيقونة تنبيه المعلومات
    faCircleXmark, // لأيقونة تنبيه الخطأ
    faCircleExclamation, // لأيقونة تنبيه التحذير
    faCircleCheck, // لأيقونة تنبيه النجاح
    faEdit // لأيقونة زر التعديل
} from '@fortawesome/free-solid-svg-icons';

// عنوان الـ API الأساسي، يمكن تحديده من متغيرات البيئة
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * مكون ConfirmModal:
 * يعرض نافذة تأكيد منبثقة بدلاً من window.confirm.
 * يستخدم أنماط الـ CSS الجديدة للمودال.
 */
const ConfirmModal = ({ show, message, onConfirm, onCancel }) => {
    if (!show) return null;

    return (
        <div className="modal-backdrop show">
            <div className="modal-content">
                <div className="modal-header">
                    <h3 className="modal-title">تأكيد الإجراء</h3>
                    <button onClick={onCancel} className="modal-close-button" aria-label="إغلاق">&times;</button>
                </div>
                <div className="modal-body">
                    <p>{message}</p>
                </div>
                <div className="modal-footer">
                    <button onClick={onCancel} className="btn btn-secondary">إلغاء</button>
                    <button onClick={onConfirm} className="btn btn-danger">تأكيد</button>
                </div>
            </div>
        </div>
    );
};

/**
 * مكون Notification:
 * يعرض إشعارًا منبثقًا في الزاوية العلوية اليسرى.
 * يستخدم أنماط الـ CSS الجديدة للتنبيهات.
 */
const Notification = ({ id, type, message, onRemove }) => {
    // ربط أنواع التنبيهات بالأيقونات المناسبة
    const iconMap = {
        success: faCircleCheck,
        error: faCircleXmark,
        warning: faCircleExclamation,
        info: faCircleInfo,
    };

    return (
        <div className={`notification notification-${type}`}>
            <FontAwesomeIcon icon={iconMap[type]} className="notification-icon" />
            <div className="notification-content">
                <p className="notification-message">{message}</p>
            </div>
            <button onClick={() => onRemove(id)} className="notification-close" aria-label="إغلاق التنبيه">&times;</button>
        </div>
    );
};

/**
 * مكون Dashboard:
 * يعرض لوحة التحكم الرئيسية مع جداول البيانات، الإحصائيات، وأدوات التحكم.
 * تم تحسينه ليتوافق مع أنماط CSS الجديدة ويقدم تجربة مستخدم محسنة.
 */
function Dashboard({ 
    onStartNewVerification, 
    onViewVerification, 
    searchQuery, 
    filterStatus, 
    filterPublished, 
    searchFields, 
    filterDueDate, 
    onOpenFilterModal, 
    onViewPublishedClients,
    onSearchChange, 
    searchTrigger 
}) {
    // حالات البيانات الأساسية للتحقق والإحصائيات
    const [verifications, setVerifications] = useState([]);
    const [dashboardStats, setDashboardStats] = useState(null);
    const [loading, setLoading] = useState(true); 
    const [error, setError] = useState(null);
    
    // حالات جديدة للميزات المحسنة: الترتيب، التحديد المجمع
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [selectedRecords, setSelectedRecords] = useState([]);
    const [showBulkActions, setShowBulkActions] = useState(false); 
    
    // حالات Pagination (التحكم في الصفحات) للجدول
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalRecordsCount, setTotalRecordsCount] = useState(0); 

    // حالات التحديث التلقائي والتنبيهات
    const [refreshInterval, setRefreshInterval] = useState(10); 
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [dueDateAlerts, setDueDateAlerts] = useState([]);

    // حالات المودال المخصص للتأكيد
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmModalMessage, setConfirmModalMessage] = useState('');
    const [confirmModalAction, setConfirmModalAction] = useState(null); // الدالة التي سيتم تنفيذها عند التأكيد

    /**
     * دالة showConfirmation:
     * تعرض مودال التأكيد المخصص مع رسالة وإجراء معين.
     * @param {string} message - الرسالة التي ستظهر في المودال.
     * @param {Function} action - الدالة التي سيتم تنفيذها عند تأكيد الإجراء.
     */
    const showConfirmation = useCallback((message, action) => {
        setConfirmModalMessage(message);
        setConfirmModalAction(() => action); // تخزين الدالة ليتم استدعاؤها لاحقاً
        setShowConfirmModal(true);
    }, []);

    /**
     * دالة handleConfirmAction:
     * تُنفذ الإجراء المخزن في confirmModalAction ثم تخفي المودال.
     */
    const handleConfirmAction = useCallback(() => {
        if (confirmModalAction) {
            confirmModalAction();
        }
        setShowConfirmModal(false);
        setConfirmModalAction(null);
        setConfirmModalMessage('');
    }, [confirmModalAction]);

    /**
     * دالة handleCancelConfirmation:
     * تلغي الإجراء وتخفي المودال.
     */
    const handleCancelConfirmation = useCallback(() => {
        setShowConfirmModal(false);
        setConfirmModalAction(null);
        setConfirmModalMessage('');
    }, []);

    /**
     * دالة fetchDashboardStats:
     * تجلب إحصائيات لوحة التحكم من الـ API.
     * تستخدم useCallback لتحسين الأداء.
     */
    const fetchDashboardStats = useCallback(async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/dashboard-stats`);
            setDashboardStats(response.data);
            
            // تحديث تنبيهات المواعيد المستحقة
            if (response.data.due_date_alerts && response.data.due_date_alerts.length > 0) {
                setDueDateAlerts(response.data.due_date_alerts);
            } else {
                setDueDateAlerts([]); // مسح التنبيهات إذا لم تكن هناك تنبيهات جديدة
            }
        } catch (err) {
            console.error('Error fetching dashboard stats:', err);
            // إضافة إشعار خطأ في حالة فشل جلب الإحصائيات
            setNotifications(prev => [...prev, {
                id: Date.now(),
                type: 'error',
                message: 'فشل في تحميل إحصائيات لوحة التحكم.'
            }]);
        }
    }, []);

    /**
     * دالة fetchVerifications:
     * تجلب سجلات التحقق من الـ API بناءً على معايير البحث والتصفية والترتيب والصفحات.
     * تستخدم useCallback لتحسين الأداء.
     */
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
            console.log("API Response Data for Verifications:", response.data); 

            const recordsToSet = Array.isArray(response.data.records) ? response.data.records : [];
            // إضافة قيم افتراضية للحقول غير الموجودة لضمان عدم وجود أخطاء عرض
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
            // إضافة إشعار خطأ في حالة فشل جلب السجلات
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

    /**
     * دالة handleDeleteVerification:
     * تتعامل مع حذف سجل واحد أو عدة سجلات (حذف مجمع).
     * تستخدم مودال التأكيد المخصص.
     * @param {string} recordId - معرف السجل المراد حذفه (إذا كان حذف فردي).
     * @param {boolean} isBulk - لتحديد ما إذا كان الإجراء حذفًا مجمعًا.
     */
    const handleDeleteVerification = useCallback(async (recordId, isBulk = false) => {
        const recordsToDelete = isBulk ? selectedRecords : [recordId];
        const confirmMessage = isBulk 
            ? `هل أنت متأكد من رغبتك في حذف ${recordsToDelete.length} سجل بشكل دائم؟`
            : 'هل أنت متأكد من رغبتك في حذف هذا السجل بشكل دائم؟';
        
        showConfirmation(confirmMessage, async () => {
            try {
                if (isBulk) {
                    // حذف كل سجل على حدة في حالة الحذف المجمع
                    for (const id of recordsToDelete) {
                        await axios.delete(`${API_BASE_URL}/verifications/${id}`);
                    }
                    setNotifications(prev => [...prev, {
                        id: Date.now(),
                        type: 'success',
                        message: `تم حذف ${recordsToDelete.length} سجل بنجاح!`
                    }]);
                    setSelectedRecords([]); // مسح التحديد بعد الحذف
                    setShowBulkActions(false); // إخفاء إجراءات التحديد المجمع
                } else {
                    await axios.delete(`${API_BASE_URL}/verifications/${recordId}`);
                    setNotifications(prev => [...prev, {
                        id: Date.now(),
                        type: 'success',
                        message: 'تم حذف السجل بنجاح!'
                    }]);
                }
                
                // إعادة جلب البيانات والإحصائيات بعد الحذف
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
        });
    }, [selectedRecords, fetchDashboardStats, fetchVerifications, showConfirmation]);

    /**
     * دالة handleTogglePublishedStatus:
     * تغير حالة النشر لسجل معين. تتطلب أن يكون السجل "مكتمل".
     * تستخدم مودال التأكيد المخصص.
     * @param {string} recordId - معرف السجل.
     * @param {boolean} currentStatus - الحالة الحالية للنشر.
     * @param {string} recordStatus - حالة الفحص الحالية للسجل.
     */
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
        
        showConfirmation(confirmMessage, async () => {
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
        });
    }, [fetchDashboardStats, fetchVerifications, showConfirmation]);

    /**
     * دالة handleSort:
     * تتعامل مع تغيير ترتيب الجدول بناءً على العمود.
     * @param {string} key - مفتاح العمود المراد الترتيب وفقه.
     */
    const handleSort = useCallback((key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
        setCurrentPage(1); // العودة للصفحة الأولى عند تغيير الترتيب
    }, [sortConfig]);

    /**
     * دالة handleSelectRecord:
     * تتعامل مع تحديد/إلغاء تحديد سجل فردي في الجدول.
     * @param {string} recordId - معرف السجل.
     */
    const handleSelectRecord = useCallback((recordId) => {
        setSelectedRecords(prev => {
            const newSelection = prev.includes(recordId)
                ? prev.filter(id => id !== recordId)
                : [...prev, recordId];
            setShowBulkActions(newSelection.length > 0); // إظهار/إخفاء إجراءات التحديد المجمع
            return newSelection;
        });
    }, []);

    /**
     * دالة handleSelectAll:
     * تتعامل مع تحديد/إلغاء تحديد جميع السجلات المرئية في الجدول.
     */
    const handleSelectAll = useCallback(() => {
        const allIds = verifications.map(record => record.id);
        const allSelected = selectedRecords.length === allIds.length && allIds.length > 0; 
        setSelectedRecords(allSelected ? [] : allIds);
        setShowBulkActions(!allSelected && allIds.length > 0); 
    }, [verifications, selectedRecords]);

    /**
     * دالة removeNotification:
     * تزيل إشعارًا معينًا من قائمة الإشعارات.
     * @param {number} notificationId - معرف الإشعار.
     */
    const removeNotification = useCallback((notificationId) => {
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    }, []);

    /**
     * totalPages:
     * يحسب إجمالي عدد الصفحات بناءً على عدد السجلات الكلي والعناصر لكل صفحة.
     * يستخدم useMemo لتحسين الأداء وتجنب إعادة الحساب غير الضرورية.
     */
    const totalPages = useMemo(() => {
        return Math.ceil(totalRecordsCount / itemsPerPage);
    }, [totalRecordsCount, itemsPerPage]);

    /**
     * useEffect للتحديث التلقائي:
     * يقوم بجلب البيانات والإحصائيات بشكل دوري إذا كان التحديث التلقائي نشطًا.
     */
    useEffect(() => {
        if (!autoRefresh) return;
        
        const interval = setInterval(() => {
            fetchVerifications();
            fetchDashboardStats();
        }, refreshInterval * 60 * 1000); // تحويل الدقائق إلى مللي ثانية
        
        return () => clearInterval(interval); // تنظيف المؤقت عند إلغاء المكون أو تغيير الاعتماديات
    }, [autoRefresh, refreshInterval, fetchVerifications, fetchDashboardStats]);

    /**
     * useEffect للتحميل الأولي:
     * يقوم بجلب البيانات والإحصائيات عند تحميل المكون لأول مرة أو عند تغيير searchTrigger.
     */
    useEffect(() => {
        fetchVerifications(); 
        fetchDashboardStats(); 
    }, [searchTrigger, fetchVerifications, fetchDashboardStats]); 

    /**
     * useEffect لإزالة التنبيهات تلقائياً:
     * يزيل التنبيهات (باستثناء أخطاء) بعد 5 ثوانٍ.
     */
    useEffect(() => {
        notifications.forEach(notification => {
            if (notification.type !== 'error') { 
                const timer = setTimeout(() => {
                    removeNotification(notification.id);
                }, 5000); // التنبيهات تختفي بعد 5 ثوانٍ
                return () => clearTimeout(timer); // تنظيف المؤقت
            }
        });
    }, [notifications, removeNotification]);

    /**
     * دالة getSortIcon:
     * تحدد أيقونة الترتيب الصحيحة (صعودي، تنازلي، أو غير مرتب) للعمود.
     * @param {string} key - مفتاح العمود.
     * @returns {object} - أيقونة FontAwesome.
     */
    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return faSort;
        return sortConfig.direction === 'asc' ? faSortUp : faSortDown;
    };

    // عرض حالة التحميل الأولية (قبل جلب أي بيانات)
    if (loading && !dashboardStats) { 
        return (
            <div className="dashboard-container loading-state">
                <div className="loading-spinner"></div>
                <p className="loading-text">جاري تحميل البيانات...</p>
            </div>
        );
    }

    // عرض حالة الخطأ
    if (error) {
        return (
            <div className="dashboard-container error-state">
                <FontAwesomeIcon icon={faExclamationTriangle} className="error-icon" />
                <h3 className="error-title">خطأ في التحميل</h3>
                <p className="error-message">{error}</p>
                <button onClick={() => window.location.reload()} className="retry-button">
                    <FontAwesomeIcon icon={faRefresh} /> إعادة المحاولة
                </button>
            </div>
        );
    }

    // عرض لوحة التحكم الرئيسية
    return (
        <div className="dashboard-container">
            {/* مودال التأكيد المخصص */}
            <ConfirmModal
                show={showConfirmModal}
                message={confirmModalMessage}
                onConfirm={handleConfirmAction}
                onCancel={handleCancelConfirmation}
            />

            {/* شريط التنبيهات (Notifications) */}
            {notifications.length > 0 && (
                <div className="notifications-container">
                    {notifications.map(notification => (
                        <Notification 
                            key={notification.id} 
                            id={notification.id}
                            type={notification.type}
                            message={notification.message}
                            onRemove={removeNotification}
                        />
                    ))}
                </div>
            )}

            {/* تنبيهات المواعيد المستحقة (Due Date Alerts) */}
            {dueDateAlerts.length > 0 && (
                <div className="due-date-alerts">
                    <FontAwesomeIcon icon={faCalendarAlt} className="alert-icon" />
                    <span>تنبيه: {dueDateAlerts.length} سجل يستحق المتابعة قريباً.</span>
                </div>
            )}

            {/* شريط الأدوات العلوي (Toolbar) */}
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
                                className="custom-checkbox"
                            />
                            تحديث تلقائي كل
                        </label>
                        <select 
                            value={refreshInterval} 
                            onChange={(e) => setRefreshInterval(Number(e.target.value))}
                            disabled={!autoRefresh}
                            className="form-select" 
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

            {/* قسم قائمة الفائزين المحسن (Table Section) */}
            <div className="table-section">
                <div className="table-header">
                    <h2 className="section-title">قائمة جميع سجلات الفحص</h2>
                    <div className="table-controls">
                        <div className="search-box">
                            <input
                                type="text"
                                placeholder="البحث في الجدول..."
                                value={searchQuery} 
                                onChange={(e) => {
                                    onSearchChange(e.target.value); 
                                    setCurrentPage(1); 
                                }}
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

                {/* إجراءات مجمعة (Bulk Actions) */}
                {showBulkActions && selectedRecords.length > 0 && ( 
                    <div className="bulk-actions">
                        <span>تم اختيار {selectedRecords.length} عنصر</span>
                        <button 
                            className="btn bulk-delete-button"
                            onClick={() => handleDeleteVerification(null, true)}
                        >
                            <FontAwesomeIcon icon={faTrash} /> حذف المحدد
                        </button>
                        <button 
                            className="btn bulk-cancel-button"
                            onClick={() => {
                                setSelectedRecords([]);
                                setShowBulkActions(false); 
                            }}
                        >
                            إلغاء التحديد
                        </button>
                    </div>
                )}

                {/* عرض حالة التحميل أو عدم وجود بيانات أو الجدول */}
                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p className="loading-text">جاري تحميل السجلات...</p>
                    </div>
                ) : (
                    verifications.length === 0 ? (
                        <div className="no-data-container">
                            <FontAwesomeIcon icon={faUsers} className="no-data-icon" />
                            <p className="no-data-message">لا يوجد سجلات فحص مطابقة.</p>
                        </div>
                    ) : (
                        <>
                            {/* Table Wrapper for improved scrolling on small screens */}
                            <div className="table-wrapper">
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
                                        {verifications.map((record) => ( 
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
                                                            {new Date(record.updated_at).toLocaleDateString('ar-EG')}
                                                        </span>
                                                    ) : 'غير محدد'}
                                                </td>
                                                <td className="td actions-cell">
                                                    {/* الأزرار تظهر بترتيب واضح: متابعة/تعديل، حذف، ثم نشر/إلغاء نشر */}
                                                    <div className="action-buttons">
                                                        <button 
                                                            className="action-button btn-info"
                                                            onClick={() => onViewVerification(record.id)}
                                                            title="متابعة الفحص / تعديل"
                                                        >
                                                            <FontAwesomeIcon icon={faEye} /> {/* يمكن استخدام faEdit هنا إذا كان المعنى تعديل فقط */}
                                                        </button>
                                                        <button
                                                            className="action-button btn-danger"
                                                            onClick={() => handleDeleteVerification(record.id)}
                                                            title="حذف الملف"
                                                        >
                                                            <FontAwesomeIcon icon={faTrash} />
                                                        </button>
                                                        {/* زر النشر/إلغاء النشر يظهر فقط إذا كانت الحالة "مكتمل" */}
                                                        {record.status === 'مكتمل' && (
                                                            <button
                                                                className={`action-button ${record.prize_published_on_group ? 'btn-warning' : 'btn-success'}`}
                                                                onClick={() => handleTogglePublishedStatus(record.id, record.prize_published_on_group, record.status)}
                                                                title={record.prize_published_on_group ? 'إلغاء النشر' : 'نشر في الجروب'}
                                                            >
                                                                <FontAwesomeIcon icon={record.prize_published_on_group ? faTimesCircle : faCheckCircle} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    {/* نص "تمت الإجراءات" يظهر فقط إذا كان السجل مكتمل وتم نشره */}
                                                    {record.status === 'مكتمل' && record.prize_published_on_group && (
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

                            {/* شريط التحكم في الصفحات (Pagination) */}
                            <div className="pagination-container">
                                <div className="pagination-info">
                                    عرض {((currentPage - 1) * itemsPerPage) + 1} إلى {Math.min(currentPage * itemsPerPage, totalRecordsCount)} من {totalRecordsCount} سجل
                                </div>
                                
                                <div className="pagination-controls">
                                    <select 
                                        value={itemsPerPage} 
                                        onChange={(e) => {
                                            setItemsPerPage(Number(e.target.value));
                                            setCurrentPage(1); // العودة للصفحة الأولى عند تغيير عدد العناصر
                                        }}
                                        className="items-per-page-select" 
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
                                            className="pagination-button" 
                                        >
                                            الأولى
                                        </button>
                                        <button 
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="pagination-button"
                                        >
                                            السابقة
                                        </button>
                                        
                                        <span className="pagination-current">
                                            صفحة {currentPage} من {totalPages}
                                        </span>
                                        
                                        <button 
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages || totalPages === 0} 
                                            className="pagination-button"
                                        >
                                            التالية
                                        </button>
                                        <button 
                                            onClick={() => setCurrentPage(totalPages)}
                                            disabled={currentPage === totalPages || totalPages === 0} 
                                            className="pagination-button"
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

            {/* الفاصل الاحترافي بين القسمين */}
            <div className="section-separator">
                <div className="separator-line"></div>
                <div className="separator-text">الإحصائيات والتقارير</div>
                <div className="separator-line"></div>
            </div>

            {/* قسم الإحصائيات والملخص المحسن (Summary Section) */}
            <div className="summary-section">
                <h2 className="section-title">
                    <FontAwesomeIcon icon={faChartLine} className="section-title-icon" />
                    لوحة التحكم الرئيسية
                </h2>
                
                {dashboardStats ? (
                    <>
                        {/* بطاقات الإحصائيات المحسنة (Stats Cards) */}
                        <div className="stats-container">
                            <div className="stat-card in-progress">
                                <div className="stat-icon">
                                    <FontAwesomeIcon icon={faClock} />
                                </div>
                                <div className="stat-content">
                                    <div className="stat-label">قيد التحقق</div>
                                    <p className="stat-value">{dashboardStats.in_progress_count || 0}</p>
                                    <span className={`stat-change ${dashboardStats.in_progress_trend > 0 ? 'positive' : (dashboardStats.in_progress_trend < 0 ? 'negative' : '')}`}>
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
                                    <span className={`stat-change ${dashboardStats.daily_completion_rate > 0 ? 'positive' : (dashboardStats.daily_completion_rate < 0 ? 'negative' : '')}`}>
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
                                    <span className={`stat-change ${dashboardStats.publish_rate > 0 ? 'positive' : (dashboardStats.publish_rate < 0 ? 'negative' : '')}`}>
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

                        {/* مخطط الإنجاز الأسبوعي (Chart Section) */}
                        {dashboardStats.weekly_completion_chart && dashboardStats.weekly_completion_chart.length > 0 ? (
                            <div className="chart-section card">
                                <h3 className="section-title">
                                    <FontAwesomeIcon icon={faChartLine} className="section-title-icon" />
                                    الإنجاز خلال الأسبوع الماضي
                                </h3>
                                <div className="completion-chart">
                                    {/* هنا يمكن دمج مكتبة رسوم بيانية مثل Recharts أو Chart.js */}
                                    <p className="no-data-message-small">المخطط سيظهر هنا عند توفر البيانات.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="chart-section card">
                                <h3 className="section-title">
                                    <FontAwesomeIcon icon={faChartLine} className="section-title-icon" />
                                    الإنجاز خلال الأسبوع الماضي
                                </h3>
                                <div className="no-data-container small">
                                    <p className="no-data-message-small">لا تتوفر بيانات للمخطط حالياً.</p>
                                </div>
                            </div>
                        )}

                        {/* شريط المهام السريعة (Quick Actions) */}
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
                    // عرض حالة التحميل لإحصائيات لوحة التحكم إذا لم تكن متوفرة بعد
                    <div className="loading-container">
                        <div className="loading-spinner large"></div>
                        <p className="loading-text">جاري تحميل إحصائيات لوحة التحكم...</p>
                    </div>
                )}
            </div>

            {/* شريط الحالة السفلي (Status Bar) */}
            <div className="status-bar">
                <div className="status-left">
                    <span className="status-item">
                        <FontAwesomeIcon icon={faUsers} />
                        إجمالي السجلات: {totalRecordsCount}
                    </span>
                    <span className="status-item">
                        <FontAwesomeIcon icon={faFilter} />
                        المرشحة: {verifications.length} 
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
