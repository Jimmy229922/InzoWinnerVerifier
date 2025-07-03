// frontend/src/components/PublishedClientsPage.js - Developed and Optimized for Professional Use

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import './Dashboard.css'; // استخدام نفس ملف CSS لتنسيق الجدول والأزرار
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faArrowLeft, 
    faSearch, 
    faSort, 
    faSortUp, 
    faSortDown,
    faUsers,
    faCalendarAlt, 
    faRefresh,
    faEdit, // أيقونة التعديل
    faTrash, // أيقونة الحذف
    faExclamationTriangle, // لأيقونة الخطأ في التنبيهات
    faCheckCircle, // لأيقونة النجاح في التنبيهات
    faBell, // أيقونة عامة للتنبيهات
    faTimes // أيقونة إغلاق التنبيه
} from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// دالة مساعدة لتوليد معرفات فريدة (للتنبيهات)
const generateUniqueId = () => Math.random().toString(36).substring(2, 9);

/**
 * مكون PublishedClientsPage
 * يعرض قائمة بالعملاء الذين تم نشرهم مع إمكانيات البحث، التصفية، الترتيب، التعديل، والحذف.
 *
 * @param {function} onBackToDashboard - دالة للعودة إلى لوحة التحكم الرئيسية.
 * @param {function} onViewVerification - دالة للانتقال إلى صفحة فحص عميل محدد (للتعديل).
 */
function PublishedClientsPage({ onBackToDashboard, onViewVerification }) {
    // حالات البيانات الرئيسية
    const [publishedClients, setPublishedClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [totalRecordsCount, setTotalRecordsCount] = useState(0); // إجمالي عدد السجلات التي تم جلبها من الـ backend

    // حالات البحث والتصفية (القيم الفعلية المطبقة على البيانات)
    const [searchFields, setSearchFields] = useState({
        client_name: '',
        email: '',
        account_number: '',
        agency_id: ''
    });
    const [dueDateFilter, setDueDateFilter] = useState(''); 
    const [publishedDateFilter, setPublishedDateFilter] = useState(''); 

    // حالات البحث والتصفية المؤقتة (لقيم حقول الإدخال قبل تطبيق الفلترة)
    const [pendingSearchFields, setPendingSearchFields] = useState({
        client_name: '',
        email: '',
        account_number: '',
        agency_id: ''
    });
    const [pendingDueDateFilter, setPendingDueDateFilter] = useState(''); 
    const [pendingPublishedDateFilter, setPendingPublishedDateFilter] = useState(''); 

    // حالة الترتيب
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    
    // حالات Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // حالات التنبيهات العائمة
    const [notifications, setNotifications] = useState([]);
    const notificationTimerRef = useRef({}); // لتخزين مؤقتات إزالة التنبيهات

    /**
     * دالة لعرض التنبيهات العائمة.
     * @param {string} message - نص الرسالة.
     * @param {'success'|'error'|'info'|'warning'} type - نوع التنبيه (لتحديد اللون والأيقونة).
     * @param {string} id - معرف فريد للتنبيه (لإدارة التنبيهات المتعددة أو تحديث نفس التنبيه).
     */
    const showNotification = useCallback((message, type, id = generateUniqueId()) => {
        // إذا كان هناك تنبيه سابق بنفس الـ ID (مثل التحديث التلقائي)، قم بمسحه أولاً
        if (notificationTimerRef.current[id]) {
            clearTimeout(notificationTimerRef.current[id]);
            delete notificationTimerRef.current[id];
        }

        setNotifications(prev => {
            const existingNotificationIndex = prev.findIndex(n => n.id === id);
            if (existingNotificationIndex > -1) {
                // تحديث التنبيه الموجود
                const updatedNotifications = [...prev];
                updatedNotifications[existingNotificationIndex] = { id, message, type };
                return updatedNotifications;
            } else {
                // إضافة تنبيه جديد
                return [...prev, { id, message, type }];
            }
        });

        // إزالة التنبيه تلقائياً بعد 3 ثوانٍ
        notificationTimerRef.current[id] = setTimeout(() => {
            setNotifications(prev => prev.filter(notif => notif.id !== id));
            delete notificationTimerRef.current[id];
        }, 3000);
    }, []);

    /**
     * دالة لإزالة تنبيه معين يدوياً.
     * @param {string} id - معرف التنبيه المراد إزالته.
     */
    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(notif => notif.id !== id));
        if (notificationTimerRef.current[id]) {
            clearTimeout(notificationTimerRef.current[id]);
            delete notificationTimerRef.current[id];
        }
    }, []);

    /**
     * دالة لجلب العملاء المنشورين من الـ Backend.
     * يتم استدعاؤها عند تحميل المكون وعند تغيير Pagination أو الترتيب.
     */
    const fetchPublishedClients = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                published: true, // فلتر ثابت لجلب العملاء المنشورين فقط
                page: currentPage, 
                limit: itemsPerPage, 
                sort_by: sortConfig.key, 
                sort_direction: sortConfig.direction, 
            };

            const response = await axios.get(`${API_BASE_URL}/verifications`, { params });
            console.log("API Response Data:", response.data); // **NEW: لطباعة البيانات المستلمة**

            // **التعديل هنا:** تحقق من أن response.data.records هي مصفوفة قبل استخدامها
            if (response.data && Array.isArray(response.data.records)) {
                setPublishedClients(response.data.records); 
                setTotalRecordsCount(response.data.total_count || 0);
            } else if (response.data && Array.isArray(response.data)) { // في حال كان الـ backend يرجع مصفوفة مباشرة
                setPublishedClients(response.data);
                setTotalRecordsCount(response.data.length);
                console.warn("Backend returned array directly. Consider wrapping in { records: [], total_count: } for consistency.");
            }
            else {
                // في حالة أن `response.data.records` ليس مصفوفة بشكل غير متوقع
                console.error("Received unexpected data format from API:", response.data);
                setPublishedClients([]);
                setTotalRecordsCount(0);
                showNotification('تنسيق بيانات غير متوقع من الخادم. يرجى مراجعة سجلات الخادم.', 'error');
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'فشل في تحميل قائمة العملاء المنشورين. يرجى التأكد من أن الخادم يعمل بشكل صحيح.';
            setError(errorMessage);
            showNotification(errorMessage, 'error'); // عرض تنبيه بالخطأ
            console.error('Error fetching published clients:', err.response ? err.response.data : err.message);
        } finally {
            setLoading(false);
        }
    }, [currentPage, itemsPerPage, sortConfig, showNotification]); // إضافة showNotification كـ dependency

    /**
     * دالة لتطبيق فلاتر البحث والتصفية بعد إدخال المستخدم.
     * تُحدث حالات البحث/التصفية الفعلية وتُعيد تعيين الصفحة لـ 1.
     */
    const handleApplySearchAndFilters = useCallback(() => {
        // يمكنك إضافة منطق تحقق من صحة المدخلات هنا قبل تطبيق الفلاتر
        // مثال: التحقق من صحة البريد الإلكتروني أو أن الأرقام هي أرقام فقط
        if (pendingSearchFields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pendingSearchFields.email)) {
            showNotification('يرجى إدخال تنسيق بريد إلكتروني صحيح للبحث.', 'warning');
            return;
        }
        // ... إضافة المزيد من التحقق للحقول الأخرى إذا لزم الأمر

        setSearchFields(pendingSearchFields);
        setDueDateFilter(pendingDueDateFilter);         
        setPublishedDateFilter(pendingPublishedDateFilter); 
        setCurrentPage(1); // دائمًا العودة للصفحة الأولى عند تطبيق فلاتر جديدة
    }, [pendingSearchFields, pendingDueDateFilter, pendingPublishedDateFilter, showNotification]);

    /**
     * دالة لمسح جميع حقول البحث والفلاتر وإعادة تعيينها إلى القيم الافتراضية.
     */
    const handleResetSearchAndFilters = useCallback(() => {
        setSearchFields({ client_name: '', email: '', account_number: '', agency_id: '' });
        setPendingSearchFields({ client_name: '', email: '', account_number: '', agency_id: '' });
        setDueDateFilter(''); 
        setPendingDueDateFilter('');
        setPublishedDateFilter(''); 
        setPendingPublishedDateFilter(''); 
        setCurrentPage(1); 
        showNotification('تم مسح جميع فلاتر البحث.', 'info');
    }, [showNotification]);

    // تأثير لجلب البيانات عند التحميل الأولي للمكون
    useEffect(() => {
        fetchPublishedClients();
        // مسح جميع مؤقتات التنبيهات عند تفريغ المكون
        return () => {
            Object.values(notificationTimerRef.current).forEach(timer => clearTimeout(timer));
            notificationTimerRef.current = {};
        };
    }, [fetchPublishedClients]); 

    // دوال الترتيب (تُطبق على البيانات المفلترة محلياً)
    const handleSort = useCallback((key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    }, [sortConfig]);

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return faSort;
        return sortConfig.direction === 'asc' ? faSortUp : faSortDown;
    };

    /**
     * دالة لمعالجة النقر على زر "تعديل".
     * تستدعي دالة `onViewVerification` الممررة من المكون الأب.
     * @param {string} clientId - معرف العميل المراد تعديله.
     */
    const handleEditClient = useCallback((clientId) => {
        console.log("Attempting to edit client with ID:", clientId); // رسالة تتبع للمطور
        if (onViewVerification) { 
            onViewVerification(clientId); // الانتقال إلى صفحة الفحص/التعديل
        } else {
            console.error('onViewVerification function is not provided to PublishedClientsPage.');
            showNotification('وظيفة التعديل غير متاحة. يرجى التأكد من إعداد التطبيق بشكل صحيح.', 'error');
        }
    }, [onViewVerification, showNotification]);

    /**
     * دالة لمعالجة حذف العميل.
     * تقوم بإرسال طلب حذف إلى الـ Backend ثم تُعيد جلب البيانات لتحديث القائمة.
     * @param {string} clientId - معرف العميل المراد حذفه.
     */
    const handleDeleteClient = useCallback(async (clientId) => {
        const confirmed = window.confirm('هل أنت متأكد من رغبتك في حذف هذا العميل بشكل دائم؟');
        if (!confirmed) {
            showNotification('تم إلغاء عملية الحذف.', 'info');
            return;
        }

        try {
            await axios.delete(`${API_BASE_URL}/verifications/${clientId}`);
            showNotification('تم حذف العميل بنجاح.', 'success');
            fetchPublishedClients(); // إعادة جلب البيانات لتحديث القائمة فوراً
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'فشل في حذف العميل. يرجى المحاولة مرة أخرى.';
            setError(errorMessage);
            showNotification(errorMessage, 'error');
            console.error('Error deleting client:', err.response ? err.response.data : err.message);
        }
    }, [fetchPublishedClients, showNotification]); 

    /**
     * تطبيق الفلترة والترتيب في الواجهة الأمامية (بعد جلب البيانات).
     * يستخدم useMemo لتحسين الأداء وتجنب إعادة الحساب غير الضرورية.
     */
    const filteredAndSortedData = useMemo(() => {
        let currentData = [...publishedClients]; 

        // تطبيق فلاتر البحث النصية (حقول متعددة)
        if (searchFields.client_name) {
            const lowerCaseName = searchFields.client_name.trim().toLowerCase();
            currentData = currentData.filter(client => 
                String(client.client_name || '').trim().toLowerCase().includes(lowerCaseName)
            );
        }
        if (searchFields.email) {
            const lowerCaseEmail = searchFields.email.trim().toLowerCase();
            currentData = currentData.filter(client => 
                String(client.email || '').trim().toLowerCase().includes(lowerCaseEmail)
            );
        }
        if (searchFields.account_number) {
            const exactAccountNumber = searchFields.account_number.trim();
            currentData = currentData.filter(client => 
                String(client.account_number || '') === exactAccountNumber
            );
        }
        if (searchFields.agency_id) {
            const exactAgencyId = searchFields.agency_id.trim();
            currentData = currentData.filter(client => 
                String(client.agency_id || '') === exactAgencyId
            );
        }

        // تطبيق فلتر تاريخ الاستحقاق
        if (dueDateFilter) {
            currentData = currentData.filter(client => 
                (client.prize_due_date ? new Date(client.prize_due_date).toISOString().substring(0, 10) : '') === dueDateFilter
            );
        }

        // تطبيق فلتر تاريخ النشر (updated_at)
        if (publishedDateFilter) {
            currentData = currentData.filter(client => {
                return (client.updated_at ? new Date(client.updated_at).toISOString().substring(0, 10) : '') === publishedDateFilter;
            });
        }
        
        // تطبيق الترتيب
        if (sortConfig.key) {
            currentData.sort((a, b) => {
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
        return currentData;
    }, [publishedClients, searchFields, dueDateFilter, publishedDateFilter, sortConfig]);

    // حساب بيانات الصفحات
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredAndSortedData.slice(startIndex, endIndex);
    }, [filteredAndSortedData, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);

    // واجهة المستخدم للتحميل والخطأ
    if (loading) {
        return (
            <div className="dashboard-container loading-state published-clients-page">
                <div className="loading-spinner"></div>
                <p className="loading-message-initial">جاري تحميل العملاء المنشورين...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-container error-state published-clients-page">
                <FontAwesomeIcon icon={faExclamationTriangle} className="error-icon" />
                <h3>خطأ في التحميل</h3>
                <p>{error}</p>
                <button onClick={() => fetchPublishedClients()} className="retry-button">
                    <FontAwesomeIcon icon={faRefresh} /> إعادة المحاولة
                </button>
            </div>
        );
    }

    return (
        <div className="dashboard-container published-clients-page">
            {/* شريط التنبيهات العائمة */}
            <div className="notifications-floating-container">
                {notifications.map(notif => (
                    <div key={notif.id} className={`notification notification-${notif.type}`}>
                        <FontAwesomeIcon icon={notif.type === 'error' ? faExclamationTriangle : faBell} className="notification-icon" />
                        <span>{notif.message}</span>
                        <button onClick={() => removeNotification(notif.id)} className="notification-close-button">
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </div>
                ))}
            </div>

            {/* شريط الأدوات العلوي مع أزرار العودة، الفلاتر، والبحث */}
            <div className="toolbar">
                <div className="toolbar-left">
                    <button className="btn btn-secondary" onClick={onBackToDashboard}>
                        <FontAwesomeIcon icon={faArrowLeft} className="icon" /> العودة للوحة التحكم
                    </button>
                    {/* فلترة حسب تاريخ الاستحقاق (باليوم) */}
                    <div className="filter-group">
                        <label className="form-label">تاريخ الاستحقاق:</label>
                        <div className="input-with-icon">
                            <input
                                type="date"
                                className="form-input"
                                value={pendingDueDateFilter}
                                onChange={(e) => setPendingDueDateFilter(e.target.value)}
                                onKeyPress={(e) => { if (e.key === 'Enter') handleApplySearchAndFilters(); }}
                            />
                            <FontAwesomeIcon icon={faCalendarAlt} className="input-icon" />
                        </div>
                    </div>
                    {/* فلترة حسب تاريخ النشر (باليوم) */}
                    <div className="filter-group">
                        <label className="form-label">تاريخ النشر:</label>
                        <div className="input-with-icon">
                            <input
                                type="date"
                                className="form-input"
                                value={pendingPublishedDateFilter}
                                onChange={(e) => setPendingPublishedDateFilter(e.target.value)}
                                onKeyPress={(e) => { if (e.key === 'Enter') handleApplySearchAndFilters(); }}
                            />
                            <FontAwesomeIcon icon={faCalendarAlt} className="input-icon" />
                        </div>
                    </div>
                </div>
                <div className="toolbar-right">
                    {/* حقول البحث المتعددة مع زر بحث واحد */}
                    <div className="search-box advanced-search">
                        <div className="search-fields">
                            <input
                                type="text"
                                placeholder="الاسم"
                                value={pendingSearchFields.client_name}
                                onChange={(e) => setPendingSearchFields(prev => ({ ...prev, client_name: e.target.value }))}
                                className="form-input"
                                onKeyPress={(e) => { if (e.key === 'Enter') handleApplySearchAndFilters(); }}
                            />
                            <input
                                type="text"
                                placeholder="الإيميل"
                                value={pendingSearchFields.email}
                                onChange={(e) => setPendingSearchFields(prev => ({ ...prev, email: e.target.value }))}
                                className="form-input"
                                onKeyPress={(e) => { if (e.key === 'Enter') handleApplySearchAndFilters(); }}
                            />
                            <input
                                type="text"
                                placeholder="رقم الحساب"
                                value={pendingSearchFields.account_number}
                                onChange={(e) => setPendingSearchFields(prev => ({ ...prev, account_number: e.target.value }))}
                                className="form-input"
                                onKeyPress={(e) => { if (e.key === 'Enter') handleApplySearchAndFilters(); }}
                            />
                            <input
                                type="text"
                                placeholder="رقم الوكالة"
                                value={pendingSearchFields.agency_id}
                                onChange={(e) => setPendingSearchFields(prev => ({ ...prev, agency_id: e.target.value }))}
                                className="form-input"
                                onKeyPress={(e) => { if (e.key === 'Enter') handleApplySearchAndFilters(); }}
                            />
                        </div>
                        <div className="button-group"> {/* Wrapper for search/clear buttons */}
                            <button className="btn btn-primary" onClick={handleApplySearchAndFilters}>
                                <FontAwesomeIcon icon={faSearch} /> بحث
                            </button>
                            <button className="btn btn-secondary" onClick={handleResetSearchAndFilters}>
                                <FontAwesomeIcon icon={faRefresh} /> مسح الفلاتر
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* قسم الجدول الرئيسي */}
            <div className="table-section">
                <h2 className="section-title">كشف كامل بالعملاء المنشورين</h2>
                {paginatedData.length === 0 ? (
                    <div className="no-data-container">
                        <FontAwesomeIcon icon={faUsers} className="no-data-icon" />
                        <p className="no-data-message">لا يوجد عملاء تم نشرهم أو لا توجد نتائج مطابقة للبحث.</p>
                    </div>
                ) : (
                    <>
                        <div className="table-container">
                            <table className="verification-table">
                                <thead>
                                    <tr>
                                        <th className="th sortable" onClick={() => handleSort('client_name')}>الاسم <FontAwesomeIcon icon={getSortIcon('client_name')} className="sort-icon" /></th>
                                        <th className="th sortable" onClick={() => handleSort('email')}>الايميل <FontAwesomeIcon icon={getSortIcon('email')} className="sort-icon" /></th>
                                        <th className="th sortable" onClick={() => handleSort('agency_id')}>رقم الوكالة <FontAwesomeIcon icon={getSortIcon('agency_id')} className="sort-icon" /></th>
                                        <th className="th sortable" onClick={() => handleSort('account_number')}>رقم الحساب <FontAwesomeIcon icon={getSortIcon('account_number')} className="sort-icon" /></th>
                                        <th className="th sortable" onClick={() => handleSort('prize_due_date')}>تاريخ الاستحقاق <FontAwesomeIcon icon={getSortIcon('prize_due_date')} className="sort-icon" /></th>
                                        <th className="th sortable" onClick={() => handleSort('updated_at')}>تاريخ النشر <FontAwesomeIcon icon={getSortIcon('updated_at')} className="sort-icon" /></th>
                                        <th className="th actions-header">الإجراءات</th> 
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedData.map((client) => (
                                        <tr key={client.id}>
                                            <td className="td">{client.client_name || 'غير محدد'}</td>
                                            <td className="td">{client.email || 'غير محدد'}</td>
                                            <td className="td">{client.agency_id || 'غير محدد'}</td>
                                            <td className="td">{client.account_number || 'غير محدد'}</td>
                                            <td className="td">
                                                {client.prize_due_date ? (
                                                    <span className={`due-date ${new Date(client.prize_due_date) < new Date() ? 'overdue' : ''}`}>
                                                        {new Date(client.prize_due_date).toLocaleDateString('ar-EG')}
                                                    </span>
                                                ) : 'غير محدد'}
                                            </td>
                                            <td className="td">
                                                {/* تاريخ النشر يتمثل في updated_at */}
                                                {client.updated_at ? (
                                                    <span className="update-time">
                                                        {new Date(client.updated_at).toLocaleString('ar-EG', { 
                                                            dateStyle: 'short', 
                                                            timeStyle: 'short' 
                                                        })}
                                                    </span>
                                                ) : 'غير محدد'}
                                            </td>
                                            <td className="td actions-cell">
                                                <div className="action-buttons">
                                                    {/* زر التعديل المحسن */}
                                                    {onViewVerification && (
                                                        <button 
                                                            className="btn btn-primary btn-sm" // استخدام كلاسات الأزرار الجديدة
                                                            onClick={() => handleEditClient(client.id)}
                                                            title="تعديل بيانات العميل"
                                                        >
                                                            <FontAwesomeIcon icon={faEdit} />
                                                            <span className="button-text">تعديل</span>
                                                        </button>
                                                    )}
                                                    {/* زر الحذف */}
                                                    <button 
                                                        className="btn btn-danger btn-sm" // استخدام كلاسات الأزرار الجديدة
                                                        onClick={() => handleDeleteClient(client.id)}
                                                        title="حذف العميل نهائياً"
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} />
                                                        <span className="button-text">حذف</span>
                                                    </button>
                                                </div>
                                                <span className="status-badge status-مكتمل">
                                                    <FontAwesomeIcon icon={faCheckCircle} /> منشور
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* شريط التحكم في الصفحات */}
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
                                    className="form-select" // استخدام كلاس form-select الجديد
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
                                        className="btn btn-outline btn-sm" // استخدام كلاسات الأزرار الجديدة
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
                )}
            </div>
        </div>
    );
}

export default PublishedClientsPage;
