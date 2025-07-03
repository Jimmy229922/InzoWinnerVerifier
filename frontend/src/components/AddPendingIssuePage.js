// frontend/src/components/AddPendingIssuePage.js

import React, { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import './Dashboard.css'; // استخدام نفس ملف CSS لتنسيق عام متناسق
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faArrowLeft, 
    faPlus, 
    // تم إزالة faUser, faIdCard, faCommentDots لأنها لم تعد مستخدمة هنا
    faBell, // لأيقونة التنبيهات
    faTimes // لأيقونة إغلاق التنبيه
} from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// دالة مساعدة لتوليد معرفات فريدة (للتنبيهات)
const generateUniqueId = () => Math.random().toString(36).substring(2, 9);

/**
 * مكون AddPendingIssuePage
 * صفحة مخصصة للشخص رقم 4 لإضافة معلقات جديدة فقط.
 *
 * @param {function} onBackToDashboard - دالة للعودة إلى لوحة التحكم الرئيسية.
 */
function AddPendingIssuePage({ onBackToDashboard }) {
    // حالات النموذج الجديد للمشكلة
    const [newIssue, setNewIssue] = useState({
        client_name: '',
        client_id: '',
        description: ''
    });

    // حالات التنبيهات العائمة
    const [notifications, setNotifications] = useState([]);
    const notificationTimerRef = useRef({});

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
            const response = await axios.post(`${API_BASE_URL}/pending-issues`, newIssue);
            console.log("New issue added:", response.data);
            showNotification('تم إضافة المعلقة بنجاح.', 'success');
            setNewIssue({ client_name: '', client_id: '', description: '' }); // مسح النموذج بعد الإضافة
        } catch (err) {
            showNotification('فشل في إضافة المعلقة. يرجى المحاولة مرة أخرى.', 'error');
            console.error('Error adding pending issue:', err);
        }
    }, [newIssue, showNotification]);

    return (
        <div className="dashboard-container add-pending-issue-page">
            {/* شريط التنبيهات العائمة */}
            <div className="notifications-floating-container">
                {notifications.map(notif => (
                    <div key={notif.id} className={`notification notification-${notif.type}`}>
                        <FontAwesomeIcon icon={notif.type === 'error' ? faTimes : faBell} className="notification-icon" />
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
                </div>
                <div className="toolbar-right">
                    {/* لا يوجد زر تحديث هنا لأن هذه الصفحة مخصصة للإضافة فقط */}
                </div>
            </div>

            {/* قسم إضافة معلقة جديدة */}
            <div className="form-section">
                <h2 className="section-title">
                    <FontAwesomeIcon icon={faPlus} className="section-title-icon" />
                    إضافة معلقة جديدة (للشفت الأول)
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
            {/* لا يوجد قسم جدول هنا، هذه الصفحة مخصصة للإضافة فقط */}
        </div>
    );
}

export default AddPendingIssuePage;