import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import './Dashboard.css'; // استخدام نفس ملف CSS لتنسيق عام متناسق
import './SettingsPage.css'; // ملف CSS خاص بصفحة الإعدادات
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faArrowLeft, 
    faCog, 
    faUserShield, // لإدارة المستخدمين
    faDatabase,   // لإعدادات البيانات
    faPalette,    // لإعدادات المظهر
    faBell,       // للتنبيهات
    faTimes,      // للإغلاق
    faSave,       // للحفظ
    faSyncAlt,    // للتحديث التلقائي/إعادة الضبط
    faExclamationTriangle, // للتحذيرات/الأخطاء
    faTrash,      // لحذف البيانات
    faCloudUploadAlt, // للنسخ الاحتياطي
    faCloudDownloadAlt, // للاستعادة
    faLock,       // للأمان
    faLanguage,   // للغة
    faMoon,       // للوضع الداكن
    faSun,        // للوضع الفاتح
    faInfoCircle, // للمعلومات
    faCheckCircle // للنجاح
} from '@fortawesome/free-solid-svg-icons';

// عنوان URL الأساسي لـ API. يمكن تعيينه عبر متغير بيئة أو الافتراضي
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// دالة بسيطة لتوليد معرفات فريدة للإشعارات
const generateUniqueId = () => Math.random().toString(36).substring(2, 9);

/**
 * مكون SettingsPage
 * يوفر واجهة لإدارة إعدادات النظام المختلفة.
 *
 * @param {function} onBackToDashboard - دالة للعودة إلى لوحة التحكم الرئيسية.
 * @param {string} currentTheme - الثيم الحالي ('light' أو 'dark').
 * @param {function} toggleTheme - دالة لتبديل الثيم.
 * @param {string} currentLanguage - اللغة الحالية ('ar' أو 'en').
 * @param {function} changeLanguage - دالة لتغيير اللغة.
 */
function SettingsPage({ onBackToDashboard, currentTheme, toggleTheme, currentLanguage, changeLanguage }) {
    // حالات (States) لإعدادات وهمية (يمكن ربطها بـ Backend لاحقاً)
    const [systemName, setSystemName] = useState('نظام إدارة الفائزين Inzo');
    const [adminEmail, setAdminEmail] = useState('admin@inzo.com');
    const [autoSaveInterval, setAutoSaveInterval] = useState(5); // بالدقائق
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [securityLoggingEnabled, setSecurityLoggingEnabled] = useState(false);
    const [dataRetentionDays, setDataRetentionDays] = useState(365); // عدد الأيام للاحتفاظ بالبيانات
    const [backupFrequency, setBackupFrequency] = useState('weekly'); // daily, weekly, monthly, never

    // حالات لإدارة واجهة المستخدم والتفاعلات
    const [notifications, setNotifications] = useState([]); // قائمة الإشعارات النشطة
    const [isLoading, setIsLoading] = useState(false); // لإظهار مؤشر التحميل
    const [showConfirmDialog, setShowConfirmDialog] = useState(false); // لإظهار/إخفاء مربع التأكيد
    const [confirmAction, setConfirmAction] = useState(null); // لتحديد الإجراء الذي يتطلب تأكيداً ('clearData', 'resetSettings')

    // محاكاة جلب الإعدادات عند تحميل المكون
    useEffect(() => {
        const fetchSettings = async () => {
            setIsLoading(true);
            try {
                // في تطبيق حقيقي، ستجلب هذه البيانات من الـ Backend الخاص بك
                // مثال: const response = await axios.get(`${API_BASE_URL}/settings`);
                // قم بتحديث الحالات بناءً على البيانات المستلمة
                // setSystemName(response.data.systemName);
                // setAdminEmail(response.data.adminEmail);
                // ... وهكذا لكل الإعدادات

                // محاكاة تأخير التحميل
                await new Promise(resolve => setTimeout(resolve, 500)); 
                showNotification('تم تحميل الإعدادات بنجاح.', 'success');
            } catch (error) {
                showNotification('فشل في تحميل الإعدادات. يرجى المحاولة مرة أخرى.', 'error');
                console.error('Error fetching settings:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, []); // يتم التشغيل مرة واحدة عند تحميل المكون

    // دالة لعرض الإشعارات العائمة
    const showNotification = useCallback((message, type, id = generateUniqueId()) => {
        // منع الإشعارات المكررة بنفس الـ ID
        if (notifications.some(notif => notif.id === id)) return; 
        
        setNotifications(prev => [...prev, { id, message, type }]);
        // إزالة الإشعار بعد 5 ثوانٍ
        setTimeout(() => {
            setNotifications(prev => prev.filter(notif => notif.id !== id));
        }, 5000); 
    }, [notifications]);

    // دالة لإزالة إشعار يدوياً
    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(notif => notif.id !== id));
    }, []);

    // دالة لحفظ التغييرات في الإعدادات
    const handleSaveChanges = async () => {
        setIsLoading(true);
        showNotification('جاري حفظ الإعدادات...', 'info');
        try {
            // هنا يمكنك إرسال الإعدادات إلى الـ Backend لحفظها بشكل دائم
            // مثال:
            // await axios.post(`${API_BASE_URL}/settings`, {
            //     systemName, 
            //     adminEmail, 
            //     autoSaveInterval, 
            //     notificationsEnabled,
            //     securityLoggingEnabled,
            //     dataRetentionDays,
            //     backupFrequency
            // });

            // محاكاة تأخير الحفظ
            await new Promise(resolve => setTimeout(resolve, 1000));
            showNotification('تم حفظ الإعدادات بنجاح!', 'success');
            console.log("Settings saved:", { 
                systemName, 
                adminEmail, 
                autoSaveInterval, 
                notificationsEnabled, 
                securityLoggingEnabled,
                dataRetentionDays,
                backupFrequency
            });
        } catch (error) {
            showNotification('فشل في حفظ الإعدادات. يرجى المحاولة مرة أخرى.', 'error');
            console.error("Error saving settings:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // دالة لمسح البيانات القديمة (تتطلب تأكيد)
    const handleClearOldData = () => {
        setShowConfirmDialog(true);
        setConfirmAction('clearData');
    };

    // دالة لإعادة ضبط الإعدادات إلى الافتراضيات (تتطلب تأكيد)
    const handleResetToDefaults = () => {
        setShowConfirmDialog(true);
        setConfirmAction('resetSettings');
    };

    // دالة لتنفيذ الإجراء المؤكد (بعد موافقة المستخدم في مربع التأكيد)
    const confirmActionExecute = async () => {
        setShowConfirmDialog(false); // إخفاء مربع التأكيد
        setIsLoading(true); // إظهار مؤشر التحميل

        if (confirmAction === 'clearData') {
            showNotification('جاري مسح البيانات القديمة...', 'info');
            try {
                // مثال: await axios.delete(`${API_BASE_URL}/data/clear-old`);
                await new Promise(resolve => setTimeout(resolve, 2000)); // محاكاة تأخير
                showNotification('تم مسح البيانات القديمة بنجاح!', 'success');
                console.log("Old data cleared.");
            } catch (error) {
                showNotification('فشل في مسح البيانات القديمة.', 'error');
                console.error("Error clearing old data:", error);
            } finally {
                setIsLoading(false);
            }
        } else if (confirmAction === 'resetSettings') {
            showNotification('جاري إعادة ضبط الإعدادات إلى الافتراضيات...', 'info');
            try {
                // مثال: await axios.post(`${API_BASE_URL}/settings/reset`);
                await new Promise(resolve => setTimeout(resolve, 1500)); // محاكاة تأخير
                // إعادة تعيين الحالات إلى القيم الافتراضية هنا في الـ Frontend
                setSystemName('نظام إدارة الفائزين Inzo');
                setAdminEmail('admin@inzo.com');
                setAutoSaveInterval(5);
                setNotificationsEnabled(true);
                setSecurityLoggingEnabled(false);
                setDataRetentionDays(365);
                setBackupFrequency('weekly');
                showNotification('تم إعادة ضبط الإعدادات بنجاح!', 'success');
                console.log("Settings reset to defaults.");
            } catch (error) {
                showNotification('فشل في إعادة ضبط الإعدادات.', 'error');
                console.error("Error resetting settings:", error);
            } finally {
                setIsLoading(false);
            }
        }
    };

    // دالة لإنشاء نسخة احتياطية للبيانات
    const handleBackupData = async () => {
        setIsLoading(true);
        showNotification('جاري إنشاء نسخة احتياطية للبيانات...', 'info');
        try {
            // مثال: await axios.post(`${API_BASE_URL}/data/backup`);
            await new Promise(resolve => setTimeout(resolve, 2500)); // محاكاة تأخير
            showNotification('تم إنشاء نسخة احتياطية للبيانات بنجاح!', 'success');
            console.log("Data backup initiated.");
        } catch (error) {
            showNotification('فشل في إنشاء نسخة احتياطية للبيانات.', 'error');
            console.error("Error backing up data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // دالة لاستعادة البيانات من نسخة احتياطية
    const handleRestoreData = async () => {
        // في تطبيق حقيقي، قد يكون هناك حقل لرفع ملف أو اختيار ملف احتياطي
        setIsLoading(true);
        showNotification('جاري استعادة البيانات من نسخة احتياطية...', 'info');
        try {
            // مثال: await axios.post(`${API_BASE_URL}/data/restore`, { backupFile: 'latest.bak' });
            await new Promise(resolve => setTimeout(resolve, 3000)); // محاكاة تأخير
            showNotification('تم استعادة البيانات بنجاح!', 'success');
            console.log("Data restoration initiated.");
        } catch (error) {
            showNotification('فشل في استعادة البيانات.', 'error');
            console.error("Error restoring data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        // إضافة الثيم الحالي كـ className لجسم الصفحة لتطبيق التنسيقات
        <div className={`dashboard-container settings-page ${currentTheme}`}>
            {/* شريط التنبيهات العائمة (Notifications) */}
            <div className="notifications-floating-container">
                {notifications.map(notif => (
                    <div key={notif.id} className={`notification notification-${notif.type}`}>
                        {/* عرض أيقونة مختلفة بناءً على نوع الإشعار */}
                        <FontAwesomeIcon 
                            icon={
                                notif.type === 'error' ? faExclamationTriangle :
                                notif.type === 'success' ? faCheckCircle :
                                faBell
                            } 
                            className="notification-icon" 
                        />
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
                    <button className="btn btn-secondary" onClick={onBackToDashboard} disabled={isLoading}>
                        <FontAwesomeIcon icon={faArrowLeft} className="icon" /> العودة للوحة التحكم
                    </button>
                </div>
                <div className="toolbar-right">
                    <button className="btn btn-primary" onClick={handleSaveChanges} disabled={isLoading}>
                        <FontAwesomeIcon icon={faSave} /> حفظ التغييرات
                    </button>
                </div>
            </div>

            {/* مؤشر التحميل (Loading Overlay) - يظهر عند isLoading = true */}
            {isLoading && (
                <div className="loading-overlay">
                    <div className="spinner"></div>
                    <span>جاري التحميل...</span>
                </div>
            )}

            {/* مربع التأكيد (Confirm Dialog) - يظهر عند showConfirmDialog = true */}
            {showConfirmDialog && (
                <div className="confirm-dialog-overlay">
                    <div className="confirm-dialog">
                        <p className="confirm-message">
                            {confirmAction === 'clearData' ? 
                                'هل أنت متأكد أنك تريد مسح البيانات القديمة؟ لا يمكن التراجع عن هذا الإجراء.' :
                                'هل أنت متأكد أنك تريد إعادة ضبط جميع الإعدادات إلى القيم الافتراضية؟'
                            }
                        </p>
                        <div className="confirm-dialog-actions">
                            <button className="btn btn-danger" onClick={confirmActionExecute} disabled={isLoading}>تأكيد</button>
                            <button className="btn btn-secondary" onClick={() => setShowConfirmDialog(false)} disabled={isLoading}>إلغاء</button>
                        </div>
                    </div>
                </div>
            )}

            {/* قسم إعدادات النظام العامة */}
            <div className="form-section">
                <h2 className="section-title">
                    <FontAwesomeIcon icon={faCog} className="section-title-icon" />
                    إعدادات النظام العامة
                </h2>
                <div className="form-group">
                    <label htmlFor="systemName" className="label">اسم النظام:</label>
                    <input
                        type="text"
                        id="systemName"
                        name="systemName"
                        value={systemName}
                        onChange={(e) => setSystemName(e.target.value)}
                        className="input"
                        placeholder="اسم نظام إدارة الفائزين"
                        disabled={isLoading}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="adminEmail" className="label">بريد مسؤول النظام:</label>
                    <input
                        type="email"
                        id="adminEmail"
                        name="adminEmail"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="input"
                        placeholder="admin@example.com"
                        disabled={isLoading}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="autoSaveInterval" className="label">فاصل الحفظ التلقائي (بالدقائق):</label>
                    <input
                        type="number"
                        id="autoSaveInterval"
                        name="autoSaveInterval"
                        value={autoSaveInterval}
                        onChange={(e) => setAutoSaveInterval(Number(e.target.value))}
                        className="input"
                        min="1"
                        disabled={isLoading}
                    />
                </div>
            </div>

            {/* قسم إعدادات الإشعارات */}
            <div className="form-section">
                <h2 className="section-title">
                    <FontAwesomeIcon icon={faBell} className="section-title-icon" />
                    إعدادات الإشعارات
                </h2>
                <div className="form-group">
                    <input
                        type="checkbox"
                        id="notificationsEnabled"
                        name="notificationsEnabled"
                        checked={notificationsEnabled}
                        onChange={(e) => setNotificationsEnabled(e.target.checked)}
                        className="checkbox"
                        disabled={isLoading}
                    />
                    <label htmlFor="notificationsEnabled" className="checkbox-label">تفعيل إشعارات النظام</label>
                </div>
            </div>

            {/* قسم إعدادات المظهر */}
            <div className="form-section">
                <h2 className="section-title">
                    <FontAwesomeIcon icon={faPalette} className="section-title-icon" />
                    إعدادات المظهر
                </h2>
                <div className="form-group">
                    <label htmlFor="themeSelect" className="label">الوضع:</label>
                    <div className="theme-toggle">
                        <button 
                            className={`btn ${currentTheme === 'light' ? 'btn-primary' : 'btn-secondary'}`} 
                            onClick={() => toggleTheme('light')}
                            disabled={isLoading}
                        >
                            <FontAwesomeIcon icon={faSun} /> فاتح
                        </button>
                        <button 
                            className={`btn ${currentTheme === 'dark' ? 'btn-primary' : 'btn-secondary'}`} 
                            onClick={() => toggleTheme('dark')}
                            disabled={isLoading}
                        >
                            <FontAwesomeIcon icon={faMoon} /> داكن
                        </button>
                    </div>
                </div>
            </div>

            {/* قسم إعدادات اللغة */}
            <div className="form-section">
                <h2 className="section-title">
                    <FontAwesomeIcon icon={faLanguage} className="section-title-icon" />
                    إعدادات اللغة
                </h2>
                <div className="form-group">
                    <label htmlFor="languageSelect" className="label">اختيار اللغة:</label>
                    <select 
                        id="languageSelect" 
                        className="input" 
                        value={currentLanguage} 
                        onChange={(e) => changeLanguage(e.target.value)}
                        disabled={isLoading}
                    >
                        <option value="ar">العربية</option>
                        <option value="en">English</option>
                    </select>
                </div>
            </div>

            {/* قسم إعدادات الأمان */}
            <div className="form-section">
                <h2 className="section-title">
                    <FontAwesomeIcon icon={faUserShield} className="section-title-icon" />
                    إعدادات الأمان
                </h2>
                <div className="form-group">
                    <input
                        type="checkbox"
                        id="securityLoggingEnabled"
                        name="securityLoggingEnabled"
                        checked={securityLoggingEnabled}
                        onChange={(e) => setSecurityLoggingEnabled(e.target.checked)}
                        className="checkbox"
                        disabled={isLoading}
                    />
                    <label htmlFor="securityLoggingEnabled" className="checkbox-label">تفعيل تسجيل الدخول الأمني</label>
                </div>
                <div className="form-group">
                    <label htmlFor="dataRetentionDays" className="label">مدة الاحتفاظ بالبيانات (أيام):</label>
                    <input
                        type="number"
                        id="dataRetentionDays"
                        name="dataRetentionDays"
                        value={dataRetentionDays}
                        onChange={(e) => setDataRetentionDays(Number(e.target.value))}
                        className="input"
                        min="30" // الحد الأدنى 30 يوم
                        max="1825" // الحد الأقصى 5 سنوات (1825 يوم)
                        disabled={isLoading}
                    />
                    <p className="hint-text">تحدد هذه المدة المدة التي يتم فيها الاحتفاظ بالسجلات والبيانات غير الأساسية.</p>
                </div>
            </div>

            {/* قسم إدارة البيانات المتقدمة */}
            <div className="form-section">
                <h2 className="section-title">
                    <FontAwesomeIcon icon={faDatabase} className="section-title-icon" />
                    إدارة البيانات المتقدمة
                </h2>
                <div className="form-group">
                    <label htmlFor="backupFrequency" className="label">تكرار النسخ الاحتياطي التلقائي:</label>
                    <select 
                        id="backupFrequency" 
                        className="input" 
                        value={backupFrequency} 
                        onChange={(e) => setBackupFrequency(e.target.value)}
                        disabled={isLoading}
                    >
                        <option value="daily">يومي</option>
                        <option value="weekly">أسبوعي</option>
                        <option value="monthly">شهري</option>
                        <option value="never">معطل</option>
                    </select>
                </div>
                <div className="quick-actions-grid">
                    <button className="btn btn-secondary" onClick={handleBackupData} disabled={isLoading}>
                        <FontAwesomeIcon icon={faCloudUploadAlt} />
                        <span>إنشاء نسخة احتياطية الآن</span>
                    </button>
                    <button className="btn btn-secondary" onClick={handleRestoreData} disabled={isLoading}>
                        <FontAwesomeIcon icon={faCloudDownloadAlt} />
                        <span>استعادة البيانات</span>
                    </button>
                    <button className="btn btn-danger" onClick={handleClearOldData} disabled={isLoading}>
                        <FontAwesomeIcon icon={faTrash} />
                        <span>مسح البيانات القديمة</span>
                    </button>
                    <button className="btn btn-warning" onClick={handleResetToDefaults} disabled={isLoading}>
                        <FontAwesomeIcon icon={faSyncAlt} />
                        <span>إعادة ضبط الإعدادات</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SettingsPage;