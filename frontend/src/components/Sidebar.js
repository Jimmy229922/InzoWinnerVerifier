
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faTachometerAlt, // لوحة التحكم
    faPlusSquare,    // فحص فائز جديد
    faCheckCircle,   // عملاء منشورون
    faSun,           // أيقونة للثيم الفاتح
    faMoon,          // أيقونة للثيم الداكن
    faExclamationCircle, // أيقونة للمعلقات
    faBars,          // أيقونة لفتح/إغلاق الشريط الجانبي (للوضع المطوي)
    faChevronLeft,   // أيقونة للطي (لليمين في RTL)
    faChevronRight,  // أيقونة للتوسيع (لليسار في RTL)
    faUserCircle,    // أيقونة ملف المستخدم الافتراضية
    faCog,           // أيقونة الإعدادات
    faQuestionCircle // أيقونة المساعدة
} from '@fortawesome/free-solid-svg-icons';
import './Sidebar.css'; // ملف CSS خاص بالشريط الجانبي

/**
 * مكون الشريط الجانبي (Sidebar)
 * يوفر روابط التنقل الرئيسية في التطبيق، مع تصميم محسّن وميزات جديدة.
 *
 * @param {string} currentView - يحدد القسم النشط حالياً.
 * @param {function} onNavigate - دالة لتغيير القسم النشط في App.js.
 * @param {function} onStartNewVerification - دالة لبدء فحص جديد.
 * @param {function} onViewPublishedClients - دالة لعرض العملاء المنشورين.
 * @param {string} theme - الثيم الحالي للموقع ('light' أو 'dark').
 * @param {function} onToggleTheme - دالة لتبديل الثيم.
 */
function Sidebar({ currentView, onNavigate, onStartNewVerification, onViewPublishedClients, theme, onToggleTheme }) {
    // حالة لطي/توسيع الشريط الجانبي
    const [isCollapsed, setIsCollapsed] = useState(false);

    // دالة لتبديل حالة الطي
    const toggleSidebar = () => {
        setIsCollapsed(prev => !prev);
    };

    return (
        <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            {/* زر طي/توسيع الشريط الجانبي */}
            <button 
                className="sidebar-toggle-button" 
                onClick={toggleSidebar}
                title={isCollapsed ? 'توسيع الشريط الجانبي' : 'طي الشريط الجانبي'}
            >
                <FontAwesomeIcon icon={isCollapsed ? faChevronLeft : faChevronRight} /> {/* أيقونات مناسبة لـ RTL */}
            </button>

            <div className="sidebar-header">
                <img src="/Inzo_logo.jpg" alt="Inzo Logo" className="sidebar-logo" />
                {!isCollapsed && <h2 className="sidebar-title">نظام إدارة الفائزين</h2>}
            </div>

            {/* قسم ملف المستخدم */}
            <div className="user-profile">
                <div className="user-avatar">
                    <FontAwesomeIcon icon={faUserCircle} /> {/* أيقونة افتراضية للمستخدم */}
                </div>
                {!isCollapsed && (
                    <div className="user-info">
                        <span className="user-name">مرحباً، المستخدم!</span>
                        <span className="user-role">مدير النظام</span>
                    </div>
                )}
            </div>

            <nav className="sidebar-nav">
                <ul>
                    <li className={currentView === 'dashboard' ? 'active' : ''}>
                        <button className="nav-button" onClick={() => onNavigate('dashboard')}>
                            <FontAwesomeIcon icon={faTachometerAlt} className="nav-icon" />
                            {!isCollapsed && <span>لوحة التحكم</span>}
                        </button>
                    </li>
                    <li className={currentView === 'newVerification' ? 'active' : ''}>
                        <button className="nav-button" onClick={() => onStartNewVerification()}>
                            <FontAwesomeIcon icon={faPlusSquare} className="nav-icon" />
                            {!isCollapsed && <span>فحص فائز جديد</span>}
                        </button>
                    </li>
                    <li className={currentView === 'publishedClients' ? 'active' : ''}>
                        <button className="nav-button" onClick={() => onViewPublishedClients()}>
                            <FontAwesomeIcon icon={faCheckCircle} className="nav-icon" />
                            {!isCollapsed && <span>العملاء المنشورون</span>}
                        </button>
                    </li>
                    <li className={currentView === 'pendingIssues' ? 'active' : ''}>
                        <button className="nav-button" onClick={() => onNavigate('pendingIssues')}>
                            <FontAwesomeIcon icon={faExclamationCircle} className="nav-icon" />
                            {!isCollapsed && <span>المعلقات</span>}
                        </button>
                    </li>
                </ul>
            </nav>

            {/* قسم الشريط الجانبي السفلي (Footer) */}
            <div className="sidebar-footer">
                <ul>
                    {/* رابط صفحة الإعدادات */}
                    <li className={currentView === 'settings' ? 'active' : ''}>
                        <button className="nav-button" onClick={() => onNavigate('settings')}>
                            <FontAwesomeIcon icon={faCog} className="nav-icon" />
                            {!isCollapsed && <span>الإعدادات</span>}
                        </button>
                    </li>
                    {/* رابط صفحة المساعدة */}
                    <li className={currentView === 'help' ? 'active' : ''}>
                        <button className="nav-button" onClick={() => onNavigate('help')}>
                            <FontAwesomeIcon icon={faQuestionCircle} className="nav-icon" />
                            {!isCollapsed && <span>المساعدة</span>}
                        </button>
                    </li>
                    {/* زر تبديل الثيم */}
                    <li className="theme-toggle-item">
                        <button className="nav-button theme-toggle-button" onClick={onToggleTheme} title="تبديل الثيم">
                            <FontAwesomeIcon icon={theme === 'light' ? faMoon : faSun} className="nav-icon" />
                            {!isCollapsed && <span>تبديل الثيم</span>}
                        </button>
                    </li>
                </ul>
            </div>
        </aside>
    );
}

export default Sidebar;