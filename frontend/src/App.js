
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import './App.css'; 

// استيراد المكونات
import Dashboard from './components/Dashboard'; 
import VerificationPage from './components/VerificationPage'; 
import FilterModal from './components/FilterModal';
import PublishedClientsPage from './components/PublishedClientsPage';
import Sidebar from './components/Sidebar'; 
import PendingIssuesPage from './components/PendingIssuesPage';
import SettingsPage from './components/SettingsPage'; // **NEW: استيراد صفحة الإعدادات**


const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api'; 

function App() {
    const [currentView, setCurrentView] = useState('dashboard'); 
    const [selectedRecordId, setSelectedRecordId] = useState(null);
    const [dashboardKey, setDashboardKey] = useState(0); 
    const [theme, setTheme] = useState('dark'); // حالة الثيم، الافتراضي هو 'dark'

    // حالات البحث والتصفية التي يديرها App.js
    const [searchQuery, setSearchQuery] = useState(''); 
    const [filterStatus, setFilterStatus] = useState('الكل'); 
    const [filterPublished, setFilterPublished] = useState('الكل');
    const [searchFields, setSearchFields] = useState(['client_name', 'email', 'account_number', 'agency_id']); 
    const [searchTrigger, setSearchTrigger] = useState(0); 
    const [showFilterModal, setShowFilterModal] = useState(false); 
    const [filterDueDate, setFilterDueDate] = useState(''); 

    const mainContentRef = useRef(null);

    // useEffect لتطبيق الثيم على الـ body class
    useEffect(() => {
        document.body.className = theme + '-theme';
    }, [theme]);

    // دالة لتبديل الثيم
    const handleToggleTheme = useCallback(() => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    }, []);

    // useEffect للتمرير إلى أعلى الصفحة عند تغيير الـ view
    useEffect(() => {
        if (mainContentRef.current) {
            mainContentRef.current.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    }, [currentView, selectedRecordId]);

    const handleStartNewVerification = async () => {
        try {
            const response = await axios.post(`${API_BASE_URL}/verifications`, {});
            setSelectedRecordId(response.data.id);
            setCurrentView('verification');
        } catch (err) {
            console.error("Error starting new verification:", err);
            alert("فشل في بدء فحص جديد. يرجى التأكد من أن الخادم الخلفي يعمل.");
        }
    };

    const handleViewVerification = (recordId) => {
        setSelectedRecordId(recordId);
        setCurrentView('verification');
    };

    const handleBackToDashboard = () => {
        setCurrentView('dashboard');
        setSelectedRecordId(null);
        setDashboardKey(prevKey => prevKey + 1); 
        
        // إعادة تعيين جميع حالات الفلاتر إلى قيمها الافتراضية لضمان عرض كل شيء
        setSearchQuery(''); 
        setFilterStatus('الكل');
        setFilterPublished('الكل');
        setSearchFields(['client_name', 'email', 'account_number', 'agency_id']); 
        setFilterDueDate('');
        
        setSearchTrigger(prev => prev + 1); 
    };

    const applyFiltersAndCloseModal = (newSearchQuery, newFilterStatus, newFilterPublished, newSearchFields, newFilterDueDate) => {
        setSearchQuery(newSearchQuery);
        setFilterStatus(newFilterStatus);
        setFilterPublished(newFilterPublished);
        setSearchFields(newSearchFields);
        setFilterDueDate(newFilterDueDate); 
        setSearchTrigger(prev => prev + 1); 
        setShowFilterModal(false); 
    };

    const handleViewPublishedClients = () => {
        setCurrentView('publishedClients');
    };

    // دالة لتغيير البحث من Dashboard
    const handleSearchChange = useCallback((query) => {
        setSearchQuery(query);
        setSearchTrigger(prev => prev + 1); // لتشغيل إعادة الجلب في Dashboard
    }, []);


    return (
        <div className="App">
            {/* تخطيط التطبيق مع الشريط الجانبي والمحتوى الرئيسي */}
            <div className="app-layout">
                <Sidebar 
                    currentView={currentView} 
                    onNavigate={setCurrentView} 
                    onStartNewVerification={handleStartNewVerification}
                    onViewPublishedClients={handleViewPublishedClients}
                    theme={theme} 
                    onToggleTheme={handleToggleTheme} 
                />

                {showFilterModal && (
                    <FilterModal
                        searchQuery={searchQuery}
                        filterStatus={filterStatus}
                        filterPublished={filterPublished}
                        searchFields={searchFields}
                        filterDueDate={filterDueDate}
                        onApplyFilters={applyFiltersAndCloseModal}
                        onClose={() => setShowFilterModal(false)}
                    />
                )}

                {/* المحتوى الرئيسي للصفحة */}
                <main className="app-main-content" ref={mainContentRef}>
                    {currentView === 'dashboard' && (
                        <Dashboard
                            key={dashboardKey}
                            onStartNewVerification={handleStartNewVerification}
                            onViewVerification={handleViewVerification}
                            searchQuery={searchQuery} 
                            filterStatus={filterStatus}
                            filterPublished={filterPublished}
                            searchFields={searchFields}
                            filterDueDate={filterDueDate}
                            onOpenFilterModal={() => setShowFilterModal(true)} 
                            onViewPublishedClients={handleViewPublishedClients}
                            onSearchChange={handleSearchChange} 
                            searchTrigger={searchTrigger} 
                        />
                    )}

                    {currentView === 'verification' && (
                        <VerificationPage
                            recordId={selectedRecordId}
                            onBackToDashboard={handleBackToDashboard}
                        />
                    )}

                    {currentView === 'publishedClients' && (
                        <PublishedClientsPage 
                            onBackToDashboard={handleBackToDashboard} 
                            searchQuery={searchQuery}
                            searchFields={searchFields}
                            filterDueDate={filterDueDate}
                            onViewVerification={handleViewVerification} 
                        />
                    )}

                    {/* إضافة صفحة المعلقات */}
                    {currentView === 'pendingIssues' && (
                        <PendingIssuesPage 
                            onBackToDashboard={() => setCurrentView('dashboard')}
                        />
                    )}

                    {/* **NEW: إضافة صفحة الإعدادات** */}
                    {currentView === 'settings' && (
                        <SettingsPage
                            onBackToDashboard={() => setCurrentView('dashboard')}
                        />
                    )}
                </main>
            </div>
        </div>
    );
}

export default App;