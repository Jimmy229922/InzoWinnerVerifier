// frontend/src/components/Sidebar.js

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faTachometerAlt, // لوحة التحكم
    faPlusSquare,    // فحص فائز جديد
    faCheckCircle,   // عملاء منشورون
    // تم إزالة faCog, faChartLine, faUsers لأنها لم تعد مستخدمة في الـ JSX
    faSun,           // أيقونة للثيم الفاتح
    faMoon,          // أيقونة للثيم الداكن
    faExclamationCircle, // أيقونة للمعلقات
    // تم إزالة faPlus لأنها لم تعد مستخدمة في الـ JSX (أصبحت تستخدم في PendingIssuesPage)
} from '@fortawesome/free-solid-svg-icons';
import './Sidebar.css'; // ملف CSS خاص بالشريط الجانبي

/**
 * مكون الشريط الجانبي (Sidebar)
 * يوفر روابط التنقل الرئيسية في التطبيق.
 *
 * @param {string} currentView - يحدد القسم النشط حالياً.
 * @param {function} onNavigate - دالة لتغيير القسم النشط في App.js.
 * @param {function} onStartNewVerification - دالة لبدء فحص جديد.
 * @param {function} onViewPublishedClients - دالة لعرض العملاء المنشورين.
 * @param {string} theme - الثيم الحالي للموقع ('light' أو 'dark').
 * @param {function} onToggleTheme - دالة لتبديل الثيم.
 */
function Sidebar({ currentView, onNavigate, onStartNewVerification, onViewPublishedClients, theme, onToggleTheme }) {
    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <img src="/Inzo_logo.jpg" alt="Inzo Logo" className="sidebar-logo" />
                <h2 className="sidebar-title">نظام إدارة الفائزين</h2>
            </div>
            <nav className="sidebar-nav">
                <ul>
                    <li className={currentView === 'dashboard' ? 'active' : ''}>
                        {/* تم تغيير <a> إلى <button> لتحسين إمكانية الوصول */}
                        <button className="nav-button" onClick={() => onNavigate('dashboard')}>
                            <FontAwesomeIcon icon={faTachometerAlt} className="nav-icon" />
                            <span>لوحة التحكم</span>
                        </button>
                    </li>
                    <li className={currentView === 'newVerification' ? 'active' : ''}>
                        {/* تم تغيير <a> إلى <button> لتحسين إمكانية الوصول */}
                        <button className="nav-button" onClick={() => onStartNewVerification()}>
                            <FontAwesomeIcon icon={faPlusSquare} className="nav-icon" />
                            <span>فحص فائز جديد</span>
                        </button>
                    </li>
                    <li className={currentView === 'publishedClients' ? 'active' : ''}>
                        {/* تم تغيير <a> إلى <button> لتحسين إمكانية الوصول */}
                        <button className="nav-button" onClick={() => onViewPublishedClients()}>
                            <FontAwesomeIcon icon={faCheckCircle} className="nav-icon" />
                            <span>العملاء المنشورون</span>
                        </button>
                    </li>
                    {/* رابط صفحة المعلقات (سيتضمن الآن الإضافة والعرض) */}
                    <li className={currentView === 'pendingIssues' ? 'active' : ''}>
                        {/* تم تغيير <a> إلى <button> لتحسين إمكانية الوصول */}
                        <button className="nav-button" onClick={() => onNavigate('pendingIssues')}>
                            <FontAwesomeIcon icon={faExclamationCircle} className="nav-icon" />
                            <span>المعلقات</span>
                        </button>
                    </li>
                    {/* تم إزالة الروابط المعلقة غير المستخدمة */}
                </ul>
            </nav>
            {/* زر تبديل الثيم */}
            <div className="theme-toggle-container">
                <button className="theme-toggle-button" onClick={onToggleTheme} title="تبديل الثيم">
                    <FontAwesomeIcon icon={theme === 'light' ? faMoon : faSun} />
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;