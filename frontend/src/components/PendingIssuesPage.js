// frontend/src/components/PendingIssuesPage.js

import React, { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import './Dashboard.css'; // استخدام نفس ملف CSS لتنسيق عام متناسق
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faArrowLeft, 
    faPlus, 
    faTrash, 
    faCheck, 
    faExclamationCircle, // أيقونة عامة للمعلقات
    faUser, // لأيقونة اسم العميل
    faIdCard, // لأيقونة المعرف
    faCommentDots, // لأيقونة الوصف
    faCalendarAlt, // لأيقونة التاريخ
    // تم إزالة faSpinner لأنها لم تعد مستخدمة هنا
    faRefresh, // لإعادة التحميل
    faBell, // لأيقونة التنبيهات
    faTimes, // لأيقونة إغلاق التنبيه
    faFileAlt, // أيقونة لتوليد الكليشة
    faPaperPlane // أيقونة للإرسال
} from '@fortawesome/free-solid-svg-icons';

import KlishaModal from './KlishaModal'; // استيراد مودال الكليشة

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// دالة مساعدة لتوليد معرفات فريدة (للتنبيهات)
const generateUniqueId = () => Math.random().toString(36).substring(2, 9);

/**
 * مكون PendingIssuesPage
 * يعرض ويسمح بإدارة المعلقات (المشاكل) بين الشفتات.
 *
 * @param {function} onBackToDashboard - دالة للعودة إلى لوحة التحكم الرئيسية.
 */
function PendingIssuesPage({ onBackToDashboard }) {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // حالات النموذج الجديد للمشكلة
    const [newIssue, setNewIssue] = useState({
        client_name: '',
        client_id: '',
        description: ''
    });

    // حالات مودال الكليشة
    const [showKlishaModal, setShowKlishaModal] = useState(false); 
    const [klishaMessage, setKlishaMessage] = useState('');

    // حالات التنبيهات العائمة
    const [notifications, setNotifications] = useState([]);
    const notificationTimerRef = useRef({});

    // **NEW: حالة لفلترة المعلقات المعروضة**
    const [statusFilter, setStatusFilter] = useState('معلقة'); // الافتراضي: عرض المعلقات فقط

    /**
     * دالة لعرض التنبيهات العائمة.
     * @param {string} message - نص الرسالة.
     * @param {'success'|'error'|'info'|'warning'} type - نوع التنبيه.
     * @param {string} id - معرف فريد للتنبيه.
     */
    const showNotification = useCallback((message, type, id = generateUniqueId()) => {
        if (notificationTimerRef.current[id]) {
            clearTimeout(notificationTimerRef.current[id]);
            delete notificationTimerRef.current[id];
        }
        setNotifications(prev => {
            const existingNotificationIndex = prev.findIndex(n => n.id === id);
            if (existingNotificationIndex > -1) {
                const updatedNotifications = [...prev];
                updatedNotifications[existingNotificationIndex] = { id, message, type };
                return updatedNotifications;
            } else {
                return [...prev, { id, message, type }];
            }
        });
        notificationTimerRef.current[id] = setTimeout(() => {
            setNotifications(prev => prev.filter(notif => notif.id !== id));
            delete notificationTimerRef.current[id];
        }, 3000);
    }, []);

    /**
     * دالة لإزالة تنبيه معين يدوياً.
     * @param {string} id - معرف التنبيه.
     */
    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(notif => notif.id !== id));
        if (notificationTimerRef.current[id]) {
            clearTimeout(notificationTimerRef.current[id]);
            delete notificationTimerRef.current[id];
        }
    }, []);

    /**
     * دالة لجلب المعلقات من الـ Backend.
     */
    const fetchPendingIssues = useCallback(async () => {
        setLoading(true);
        setError(null); // مسح أي أخطاء سابقة
        console.log(`Fetching pending issues with status_filter: ${statusFilter}...`); // تتبع بداية الجلب
        try {
            const params = { status_filter: statusFilter }; // **NEW: تمرير فلتر الحالة إلى الـ Backend**
            const response = await axios.get(`${API_BASE_URL}/pending-issues`, { params });
            console.log("API Response for Pending Issues:", response.data); // **مهم: لطباعة الاستجابة**

            if (Array.isArray(response.data)) {
                // **تأكيد تعيين is_sent_to_group كـ false إذا كانت غير موجودة**
                const fetchedIssues = response.data.map(issue => ({
                    ...issue,
                    is_sent_to_group: issue.is_sent_to_group === undefined ? false : issue.is_sent_to_group
                }));
                setIssues(fetchedIssues);
                console.log("Pending issues loaded successfully:", fetchedIssues.length, "items."); // تتبع عدد العناصر
            } else {
                console.error("Received unexpected data format for pending issues:", response.data);
                setIssues([]);
                showNotification('تنسيق بيانات المعلقات غير متوقع من الخادم. يرجى مراجعة سجلات الخادم.', 'error');
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'فشل في تحميل المعلقات. يرجى التأكد من أن الخادم يعمل بشكل صحيح.';
            setError(errorMessage);
            showNotification(errorMessage, 'error');
            console.error('Error fetching pending issues:', err.response ? err.response.data : err.message);
        } finally {
            setLoading(false); // إخفاء مؤشر التحميل
            console.log("Finished fetching pending issues. Loading state:", false); // تتبع نهاية الجلب
        }
    }, [showNotification, statusFilter]); // **NEW: إضافة statusFilter كـ dependency**

    // جلب المعلقات عند تحميل الصفحة أو تغيير فلتر الحالة
    useEffect(() => {
        console.log("PendingIssuesPage mounted or statusFilter changed. Initiating data fetch."); // تتبع تحميل المكون
        fetchPendingIssues();
        return () => {
            console.log("PendingIssuesPage unmounted. Clearing notification timers."); // تتبع تفريغ المكون
            Object.values(notificationTimerRef.current).forEach(timer => clearTimeout(timer));
            notificationTimerRef.current = {};
        };
    }, [fetchPendingIssues]); // يعتمد الآن على fetchPendingIssues فقط، التي تعتمد بدورها على statusFilter

    /**
     * معالجة تغييرات حقول النموذج.
     */
    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setNewIssue(prev => ({ ...prev, [name]: value }));
    }, []);

    /**
     * معالجة إضافة معلقة جديدة.
     */
    const handleAddIssue = useCallback(async (e) => {
        e.preventDefault();
        if (!newIssue.client_name.trim() || !newIssue.client_id.trim() || !newIssue.description.trim()) {
            showNotification('يرجى ملء جميع الحقول لإضافة معلقة.', 'warning');
            return;
        }
        try {
            await axios.post(`${API_BASE_URL}/pending-issues`, newIssue);
            showNotification('تم إضافة المعلقة بنجاح.', 'success');
            setNewIssue({ client_name: '', client_id: '', description: '' }); // مسح النموذج
            fetchPendingIssues(); // تحديث القائمة
        } catch (err) {
            showNotification('فشل في إضافة المعلقة. يرجى المحاولة مرة أخرى.', 'error');
            console.error('Error adding pending issue:', err);
        }
    }, [newIssue, fetchPendingIssues, showNotification]);

    /**
     * معالجة تحديث حالة معلقة (مثلاً: تم الحل).
     */
    const handleMarkAsResolved = useCallback(async (issueId) => {
        const confirmed = window.confirm('هل أنت متأكد من أن هذه المعلقة قد تم حلها؟');
        if (!confirmed) return;
        try {
            await axios.put(`${API_BASE_URL}/pending-issues/${issueId}`, { status: 'تم الحل' });
            showNotification('تم تحديث حالة المعلقة إلى "تم الحل".', 'success');
            fetchPendingIssues(); // تحديث القائمة
        }  catch (err) {
            showNotification('فشل في تحديث حالة المعلقة.', 'error');
            console.error('Error updating pending issue status:', err);
        }
    }, [fetchPendingIssues, showNotification]);

    /**
     * معالجة حذف معلقة.
     */
    const handleDeleteIssue = useCallback(async (issueId) => {
        const confirmed = window.confirm('هل أنت متأكد من رغبتك في حذف هذه المعلقة بشكل دائم؟');
        if (!confirmed) return;
        try {
            await axios.delete(`${API_BASE_URL}/pending-issues/${issueId}`);
            showNotification('تم حذف المعلقة بنجاح.', 'success');
            fetchPendingIssues(); // تحديث القائمة
        } catch (err) {
            showNotification('فشل في حذف المعلقة.', 'error');
            console.error('Error deleting pending issue:', err);
        }
    }, [fetchPendingIssues, showNotification]);

    /**
     * دالة لتوليد كليشة المعلقات.
     * تجمع المعلقات غير المرسلة (is_sent_to_group: false) وتنسقها في رسالة.
     */
    const handleGenerateIssuesKlisha = useCallback(() => {
        // تصفية المعلقات التي لم يتم إرسالها بعد للجروب
        const unsentIssues = issues.filter(issue => !issue.is_sent_to_group);

        if (unsentIssues.length === 0) {
            showNotification('لا توجد معلقات جديدة لتوليد كليشة لها.', 'info');
            return;
        }

        let klisha = "قائمة المعلقات:\n\n";
        unsentIssues.forEach((issue, index) => {
            klisha += `اسم العميل او الوكيل: ${issue.client_name || 'غير محدد'}\n`;
            klisha += `المعرف الخاص به علي التلجرام: ${issue.client_id || 'غير محدد'}\n`;
            klisha += `وصف المعلقة: ${issue.description || 'لا يوجد وصف'}\n`;
            if (index < unsentIssues.length - 1) {
                klisha += "\n--------------------\n\n"; // إضافة فاصل بين المعلقات
            }
        });

        setKlishaMessage(klisha);
        setShowKlishaModal(true);
    }, [issues, showNotification]);

    /**
     * دالة لتأكيد إرسال المعلقات للجروب.
     * يتم استدعاؤها من مودال الكليشة بعد أن ينسخ المستخدم الرسالة.
     * تقوم بتحديث خاصية is_sent_to_group إلى true للمعلقات التي تم تضمينها في الكليشة.
     */
    const handleConfirmSendKlisha = useCallback(async () => {
        // جمع IDs المعلقات التي لم يتم إرسالها بعد للجروب
        const issueIdsToSend = issues.filter(issue => !issue.is_sent_to_group).map(issue => issue.id);

        if (issueIdsToSend.length === 0) {
            showNotification('لا توجد معلقات لتأكيد إرسالها.', 'info');
            setShowKlishaModal(false);
            return;
        }

        try {
            // استدعاء API جديد لتحديث خاصية is_sent_to_group
            const response = await axios.put(`${API_BASE_URL}/pending-issues/mark-sent`, { ids: issueIdsToSend });
            console.log("Mark sent API response:", response.data); // تتبع استجابة الـ API

            showNotification('تم تأكيد إرسال المعلقات بنجاح!', 'success');
            setShowKlishaModal(false); // إغلاق المودال
            fetchPendingIssues(); // **مهم جداً: إعادة جلب البيانات لتحديث الجدول**
        } catch (err) {
            showNotification('فشل في تأكيد إرسال المعلقات. يرجى المحاولة مرة أخرى.', 'error');
            console.error('Error marking issues as sent:', err.response ? err.response.data : err.message);
        }
    }, [issues, fetchPendingIssues, showNotification]);


    // تحسينات على واجهة المستخدم للتحميل والخطأ
    if (loading) {
        return (
            <div className="dashboard-container loading-state">
                <div className="loading-spinner"></div>
                <p className="loading-message-initial">جاري تحميل المعلقات...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-container error-state">
                <FontAwesomeIcon icon={faExclamationCircle} className="error-icon" />
                <h3>خطأ في التحميل</h3>
                <p>{error}</p>
                <button onClick={fetchPendingIssues} className="retry-button">
                    <FontAwesomeIcon icon={faRefresh} /> إعادة المحاولة
                </button>
            </div>
        );
    }

    return (
        <div className="dashboard-container pending-issues-page">
            {/* شريط التنبيهات العائمة */}
            <div className="notifications-floating-container">
                {notifications.map(notif => (
                    <div key={notif.id} className={`notification notification-${notif.type}`}>
                        <FontAwesomeIcon icon={notif.type === 'error' ? faExclamationCircle : faBell} className="notification-icon" />
                        <span>{notif.message}</span>
                        <button onClick={() => removeNotification(notif.id)} className="notification-close-button">
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </div>
                ))}
            </div>

            {/* شريط الأدوات العلوي */}
            <div className="toolbar">
                <div className="toolbar-left">
                    <button className="btn btn-secondary" onClick={onBackToDashboard}>
                        <FontAwesomeIcon icon={faArrowLeft} className="icon" /> العودة للوحة التحكم
                    </button>
                    {/* **NEW: زر تبديل فلتر الحالة** */}
                    <select 
                        className="form-select" 
                        value={statusFilter} 
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="معلقة">المعلقات النشطة</option>
                        <option value="تم الحل">المعلقات المحلولة</option>
                        <option value="الكل">عرض الكل</option>
                    </select>
                </div>
                <div className="toolbar-right">
                    <button className="btn btn-primary" onClick={fetchPendingIssues}>
                        <FontAwesomeIcon icon={faRefresh} /> تحديث المعلقات
                    </button>
                    {/* زر توليد كليشة المعلقات */}
                    <button className="btn btn-info" onClick={handleGenerateIssuesKlisha}>
                        <FontAwesomeIcon icon={faFileAlt} /> توليد كليشة المعلقات
                    </button>
                </div>
            </div>

            {/* قسم إضافة معلقة جديدة */}
            <div className="form-section">
                <h2 className="section-title">
                    <FontAwesomeIcon icon={faPlus} className="section-title-icon" />
                    إضافة معلقة جديدة
                </h2>
                <form onSubmit={handleAddIssue}>
                    <div className="form-group">
                        <label htmlFor="client_name" className="label">اسم العميل:</label>
                        <input
                            type="text"
                            id="client_name"
                            name="client_name"
                            value={newIssue.client_name}
                            onChange={handleInputChange}
                            className="input"
                            placeholder="ادخل اسم العميل"
                            style={{ minHeight: '40px' }} 
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="client_id" className="label">المعرف الخاص بالعميل:</label>
                        <input
                            type="text"
                            id="client_id"
                            name="client_id"
                            value={newIssue.client_id}
                            onChange={handleInputChange}
                            className="input"
                            placeholder="ادخل المعرف الخاص بالعميل"
                            style={{ minHeight: '40px' }} 
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="description" className="label">وصف المشكلة/السبب:</label>
                        <textarea
                            id="description"
                            name="description"
                            value={newIssue.description}
                            onChange={handleInputChange}
                            className="textarea"
                            placeholder="اكتب وصفاً موجزاً للمشكلة أو سبب التعليق..."
                            rows="4" 
                            style={{ minHeight: '100px', resize: 'vertical' }} 
                        ></textarea>
                    </div>
                    <button type="submit" className="btn btn-success btn-lg">
                        <FontAwesomeIcon icon={faPlus} /> إضافة معلقة
                    </button>
                </form>
            </div>

            {/* قسم قائمة المعلقات الحالية */}
            <div className="table-section">
                <h2 className="section-title">
                    <FontAwesomeIcon icon={faExclamationCircle} className="section-title-icon" />
                    قائمة المعلقات الحالية
                </h2>
                {issues.length === 0 ? (
                    <div className="no-data-container">
                        <FontAwesomeIcon icon={faExclamationCircle} className="no-data-icon" />
                        <p className="no-data-message">لا توجد معلقات حالياً.</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="verification-table">
                            <thead>
                                <tr>
                                    <th><FontAwesomeIcon icon={faUser} /> اسم العميل</th>
                                    <th><FontAwesomeIcon icon={faIdCard} /> المعرف</th>
                                    <th><FontAwesomeIcon icon={faCommentDots} /> الوصف</th>
                                    <th><FontAwesomeIcon icon={faCalendarAlt} /> تاريخ الإنشاء</th>
                                    <th>الحالة</th>
                                    <th><FontAwesomeIcon icon={faPaperPlane} /> تم الإرسال</th> {/* عمود لخاصية تم الإرسال */}
                                    <th>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {issues.map(issue => (
                                    <tr key={issue.id}>
                                        <td>{issue.client_name}</td>
                                        <td>{issue.client_id}</td>
                                        {/* إضافة خاصية title لعرض الوصف الكامل عند التحويم */}
                                        <td title={issue.description}>{issue.description}</td> 
                                        <td>{new Date(issue.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                        <td>
                                            {/* استخدام كلاسات الحالة المناسبة */}
                                            <span className={`status-badge status-${issue.status === 'معلقة' ? 'جاري' : 'مكتمل'}`}>
                                                {issue.status}
                                            </span>
                                        </td>
                                        {/* خلية لخاصية تم الإرسال */}
                                        <td className="text-center">
                                            {issue.is_sent_to_group ? (
                                                <FontAwesomeIcon icon={faCheck} className="text-success" /> // أيقونة صح خضراء
                                            ) : (
                                                <FontAwesomeIcon icon={faTimes} className="text-danger" /> // أيقونة خطأ حمراء
                                            )}
                                        </td>
                                        <td className="actions-cell">
                                            {issue.status === 'معلقة' && (
                                                <button 
                                                    className="btn btn-success btn-sm" 
                                                    onClick={() => handleMarkAsResolved(issue.id)}
                                                    title="تم الحل"
                                                >
                                                    <FontAwesomeIcon icon={faCheck} /> حل
                                                </button>
                                            )}
                                            <button 
                                                className="btn btn-danger btn-sm" 
                                                onClick={() => handleDeleteIssue(issue.id)}
                                                title="حذف المعلقة"
                                            >
                                                <FontAwesomeIcon icon={faTrash} /> حذف
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* مودال الكليشة */}
            {showKlishaModal && (
                <KlishaModal 
                    message={klishaMessage} 
                    onClose={() => setShowKlishaModal(false)} 
                    onPublishAndClose={handleConfirmSendKlisha} 
                    buttonText="تأكيد إرسال المعلقات" 
                />
            )}
        </div>
    );
}

export default PendingIssuesPage;