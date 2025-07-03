// frontend/src/components/VerificationPage.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import KlishaModal from './KlishaModal'; // المسار الصحيح
import './VerificationPage.css';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faArrowLeft,
    faUserCheck,
    faCheckSquare,
    faBuilding,
    faCamera,
    faGift,
    faSpinner, // **NEW: تم إضافة استيراد faSpinner هنا**
    faCalendarAlt,
    faExclamationTriangle,
    faTimesCircle, // هذه الأيقونة مستخدمة في رسائل الخطأ
    faBell,
    faXmark
} from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api'; 

const generateUniqueId = () => Math.random().toString(36).substring(2, 9);

function VerificationPage({ recordId, onBackToDashboard }) {
    const defaultRecord = useRef({
        client_name: '',
        email: '',
        account_number: '',
        prize_amount: 0,
        agent_name: '',
        agency_type: '',
        agency_id: '',
        name_verified: false,
        crm_account_valid: false,
        mt5_screenshot_received: false,
        agency_affiliation_verified: false,
        mt5_screenshot_notes: '',
        prize_type: 'بونص تداولي',
        deposit_bonus_percentage: 0,
        competition_name: 'غير محدد',
        status: 'جاري',
        prize_published_on_group: false, // False in Python, false in JS
        prize_due_date: '',
    }).current; 

    const [record, setRecord] = useState(defaultRecord);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isNewRecord, setIsNewRecord] = useState(!recordId);
    const [showKlishaModal, setShowKlishaModal] = useState(false);
    const [klishaMessage, setKlishaMessage] = useState('');
    const [notifications, setNotifications] = useState([]); 

    const saveTimerRef = useRef(null); 
    const notificationTimerRef = useRef({});

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

    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(notif => notif.id !== id));
        if (notificationTimerRef.current[id]) {
            clearTimeout(notificationTimerRef.current[id]);
            delete notificationTimerRef.current[id];
        }
    }, []);

    const isValidArabicName = (name) => {
        const arabicNameRegex = /^[\u0600-\u06FF\s\p{P}]+$/u;
        const forbiddenWords = ['gmail', 'جيميل', 'yahoo', 'hotmail', 'email', 'ايميل', 'بريد'];
        
        if (!name || name.trim() === '') {
            return { valid: false, message: 'الاسم مطلوب.' };
        }
        if (!arabicNameRegex.test(name.trim())) {
            return { valid: false, message: 'يجب أن يحتوي الاسم على أحرف عربية ومسافات فقط.' };
        }
        if (/\d/.test(name.trim())) {
            return { valid: false, message: 'يجب ألا يحتوي الاسم على أرقام.' };
        }
        if (/[a-zA-Z]/.test(name.trim())) {
            return { valid: false, message: 'يجب ألا يحتوي الاسم على أحرف إنجليزية.' };
        }
        if (forbiddenWords.some(word => name.toLowerCase().includes(word))) {
            return { valid: false, message: 'لا يمكن أن يحتوي الاسم على كلمات مثل "جيميل" أو ما شابه.' };
        }
        return { valid: true, message: '' };
    };

    const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const nameLikePattern = /[\u0600-\u06FF\s]+/; 
        const containsManyDigits = /\b\d{5,}\b/; 

        if (!email || email.trim() === '') {
            return { valid: false, message: 'البريد الإلكتروني مطلوب.' };
        }
        if (!emailRegex.test(email.trim())) {
            return { valid: false, message: 'صيغة البريد الإلكتروني غير صحيحة.' };
        }
        if (nameLikePattern.test(email.trim()) || containsManyDigits.test(email.trim().split('@')[0])) {
            return { valid: false, message: 'يجب أن يكون بريدًا إلكترونيًا صالحًا، وليس اسمًا أو أرقامًا عشوائية.' };
        }
        return { valid: true, message: '' };
    };

    const isValidNumber = (value, fieldName = 'الحقل') => {
        const numbersOnlyRegex = /^\d+$/; 
        if (!value || value.trim() === '') {
            return { valid: false, message: `${fieldName} مطلوب.` };
        }
        if (!numbersOnlyRegex.test(value.trim())) {
            return { valid: false, message: `يجب أن يحتوي ${fieldName} على أرقام فقط.` };
        }
        return { valid: true, message: '' };
    };

    const [validationErrors, setValidationErrors] = useState({
        client_name: '',
        email: '',
        agency_id: '',
        account_number: ''
    });

    const runValidations = useCallback((currentRecord) => {
        let errors = { client_name: '', email: '', agency_id: '', account_number: '' };
        let allValid = true;

        const nameValidation = isValidArabicName(currentRecord.client_name);
        if (!nameValidation.valid) {
            errors.client_name = nameValidation.message;
            allValid = false;
        }

        const emailValidation = isValidEmail(currentRecord.email);
        if (!emailValidation.valid) {
            errors.email = emailValidation.message;
            allValid = false;
        }

        const agencyIdValidation = isValidNumber(currentRecord.agency_id, 'رقم الوكالة');
        if (!agencyIdValidation.valid) {
            errors.agency_id = agencyIdValidation.message;
            allValid = false;
        }

        if (currentRecord.crm_account_valid) {
            const accountNumberValidation = isValidNumber(currentRecord.account_number, 'رقم الحساب');
            if (!accountNumberValidation.valid) {
                errors.account_number = accountNumberValidation.message;
                allValid = false;
            }
        } else {
            errors.account_number = ''; 
        }
        
        setValidationErrors(errors);
        return allValid;
    }, []);

    const saveRecord = useCallback(async (currentRecord) => {
        if (!currentRecord || !currentRecord.id) {
            console.warn("Attempted to save a record with no ID. Skipping auto-save.");
            return;
        }
        
        runValidations(currentRecord); 

        showNotification('جاري الحفظ...', 'info', 'autosave');
        try {
            const url = `${API_BASE_URL}/verifications/${currentRecord.id}`; 
            await axios.put(url, currentRecord);
            showNotification('تم الحفظ بنجاح.', 'success', 'autosave');
        } catch (err) {
            console.error("خطأ في حفظ السجل:", err.response ? err.response.data : err.message);
            showNotification('خطأ في الحفظ!', 'error', 'autosave');
            setError("فشل في حفظ البيانات تلقائياً.");
        } finally {
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
            }
        }
    }, [showNotification, runValidations]);

    const initializeRecord = useCallback(async (idToLoad = recordId) => { 
        setLoading(true);
        setError(null);
        try {
            let fetchedRecordData;
            if (idToLoad) {
                const response = await axios.get(`${API_BASE_URL}/verifications/${idToLoad}`);
                fetchedRecordData = response.data;
                setIsNewRecord(false);
            } else {
                const response = await axios.post(`${API_BASE_URL}/verifications`, {});
                fetchedRecordData = response.data;
                setIsNewRecord(true);
            }
            
            // دمج البيانات المستلمة مع القيم الافتراضية لضمان وجود كل الحقول
            const finalRecord = {
                ...defaultRecord, 
                ...fetchedRecordData 
            };
            setRecord(finalRecord);
            runValidations(finalRecord);
        } catch (err) {
            console.error("خطأ في تحميل/إنشاء سجل:", err);
            setError("فشل في تحميل/إنشاء سجل. يرجى المحاولة مرة أخرى.");
            setRecord(defaultRecord); 
        } finally {
            setLoading(false);
        }
    }, [recordId, defaultRecord, runValidations]);

    useEffect(() => {
        initializeRecord();

        return () => {
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
            }
            Object.values(notificationTimerRef.current).forEach(timer => clearTimeout(timer));
            notificationTimerRef.current = {};
        };
    }, [recordId, initializeRecord]); 

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        setRecord(prevRecord => {
            const updated = {
                ...prevRecord,
                [name]: type === 'checkbox' ? checked : value
            };
            runValidations(updated);
            return updated;
        });

        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
        }
        saveTimerRef.current = setTimeout(() => {
            setRecord(prevRecord => {
                // استخدام القيمة الأحدث من الـ state وليس من الـ event مباشرة للحفظ
                const recordToSave = { ...prevRecord };
                saveRecord(recordToSave);
                return recordToSave;
            });
        }, 500);
    };

    const handleGenerateKlisha = async () => {
        if (!record || (!record.id && !isNewRecord)) {
            showNotification("لا يوجد سجل لتحويله إلى كليشة. يرجى إنشاء سجل جديد أولاً.", "warning", generateUniqueId());
            return;
        }

        if (!runValidations(record)) {
            showNotification("يرجى تصحيح الأخطاء في البيانات الأساسية قبل توليد الكليشة.", "error", generateUniqueId());
            return;
        }

        const requiredFields = [
            'name_verified', 'crm_account_valid', 'agency_affiliation_verified', 'mt5_screenshot_received',
            'client_name', 'email', 'agency_id', 'prize_due_date'
        ];
        const missingFields = requiredFields.filter(field => {
            if (typeof record[field] === 'boolean') return !record[field]; 
            if (field === 'prize_amount' && record.prize_type === 'بونص تداولي') return record[field] === 0; 
            if (field === 'deposit_bonus_percentage' && record.prize_type === 'بونص ايداع') return record[field] === 0; 
            if (typeof record[field] === 'string') return !record[field].trim();
            return false;
        });
        
        if (record.crm_account_valid && (!record.account_number || record.account_number.trim() === '')) {
            missingFields.push('رقم الحساب المؤهل/الجديد');
        }

        if (record.prize_type === 'بونص ايداع' && record.deposit_bonus_percentage === 0) {
            missingFields.push('نسبة بونص الإيداع');
        }

        if (missingFields.length > 0) {
            showNotification(`لا يمكن توليد الكليشة. يرجى إكمال جميع خطوات التحقق وملء البيانات الأساسية المطلوبة: \n- ${missingFields.join('\n- ')}`, "error", generateUniqueId());
            return;
        }
        
        try {
            await axios.put(`${API_BASE_URL}/verifications/${record.id}`, record); 
            showNotification('تم حفظ البيانات بنجاح قبل توليد الكليشة.', 'success', generateUniqueId());

            const response = await axios.get(`${API_BASE_URL}/generate-klisha/${record.id}`);
            setKlishaMessage(response.data.klisha);
            setShowKlishaModal(true);
        } catch (err) {
            console.error("خطأ في توليد الكليشة:", err.response ? err.response.data : err.message);
            setError("فشل في توليد الكليشة. يرجى مراجعة البيانات والتأكد من اتصال الخادم.");
            showNotification("حدث خطأ أثناء توليد الكليشة. يرجى مراجعة البيانات وتصحيحها.", "error", generateUniqueId());
        }
    };

    const handlePublishAndExit = async () => {
        if (!record || !record.id) {
            showNotification("لا يوجد سجل للنشر. يرجى إنشاء سجل جديد أولاً.", "warning", generateUniqueId());
            return;
        }

        if (!runValidations(record)) {
            showNotification("يرجى تصحيح الأخطاء في البيانات الأساسية قبل تأكيد النشر.", "error", generateUniqueId());
            return;
        }

        const finalRequiredFields = [
            'client_name', 'email', 'agency_id', 'prize_due_date',
            'name_verified', 'crm_account_valid', 'agency_affiliation_verified', 'mt5_screenshot_received'
        ];
        const finalMissingFields = finalRequiredFields.filter(field => {
            if (field === 'account_number' && record.crm_account_valid && (!record.account_number || record.account_number.trim() === '')) return true;
            if (field === 'account_number' && !record.crm_account_valid) return false; // لا نحتاج رقم الحساب إذا لم يتم التحقق من CRM
            
            if (typeof record[field] === 'boolean') return !record[field];
            if (typeof record[field] === 'string') return !record[field].trim();
            return false;
        });

        if (record.prize_type === 'بونص ايداع' && record.deposit_bonus_percentage === 0) {
            finalMissingFields.push('نسبة بونص الإيداع');
        }

        if (finalMissingFields.length > 0) {
            showNotification(`لا يمكن النشر. يرجى إكمال جميع البيانات وخطوات التحقق النهائية:\n- ${finalMissingFields.join('\n- ')}`, "error", generateUniqueId());
            return;
        }

        try {
            const updatedRecord = { 
                ...record, 
                prize_published_on_group: true, 
                status: 'مكتمل' 
            };
            await axios.put(`${API_BASE_URL}/verifications/${record.id}`, updatedRecord);
            setRecord(updatedRecord);

            showNotification('تم تأكيد نشر الجائزة بنجاح! سيتم العودة إلى لوحة التحكم.', 'success', generateUniqueId());
            setShowKlishaModal(false);
            setTimeout(() => onBackToDashboard(), 1000); 
        } catch (err) {
            console.error("خطأ في تأكيد النشر والعودة:", err.response ? err.response.data : err.message);
            showNotification("فشل في تأكيد النشر. يرجى المحاولة مرة أخرى.", "error", generateUniqueId());
        }
    };

    if (loading) {
        return (
            <div className="verification-container loading-state">
                <FontAwesomeIcon icon={faSpinner} spin className="loading-icon" />
                <p className="loading-message-initial">جاري تحميل/إنشاء سجل الفحص...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="verification-container error-state">
                <FontAwesomeIcon icon={faExclamationTriangle} className="error-icon" />
                خطأ: {error}
            </div>
        );
    }

    return (
        <div className="verification-container">
            <div className="notifications-floating-container">
                {notifications.map(notif => (
                    <div key={notif.id} className={`notification notification-${notif.type}`}>
                        <FontAwesomeIcon icon={notif.type === 'error' ? faExclamationTriangle : faBell} className="notification-icon" />
                        <span>{notif.message}</span>
                        <button onClick={() => removeNotification(notif.id)} className="notification-close-button">
                            <FontAwesomeIcon icon={faXmark} />
                        </button>
                    </div>
                ))}
            </div>

            <div className="header">
                <h2 className="heading">{isNewRecord ? 'فحص فائز جديد' : `متابعة فحص: ${record.client_name || record.id?.substring(0, 8) + '...'}`}</h2>
                <button className="btn btn-outline" onClick={onBackToDashboard}>
                    <FontAwesomeIcon icon={faArrowLeft} /> العودة للداشبورد
                </button>
            </div>

            <div className="form-sections-wrapper">
                <div className="form-section">
                    <h3 className="sub-heading"><FontAwesomeIcon icon={faUserCheck} className="icon" /> 1. البيانات الأساسية للفائز</h3>
                    <div className="form-group">
                        <label htmlFor="client_name" className="label">الاسم الثلاثي للعميل:</label>
                        <input
                            type="text"
                            id="client_name"
                            name="client_name"
                            value={record.client_name}
                            onChange={handleChange}
                            className={`input ${validationErrors.client_name ? 'input-error' : ''}`}
                            placeholder="ادخل الاسم الثلاثي للعميل"
                            disabled={loading}
                        />
                        {validationErrors.client_name && (
                            <p className="error-message-inline">
                                <FontAwesomeIcon icon={faTimesCircle} className="error-icon-small" />
                                {validationErrors.client_name}
                            </p>
                        )}
                    </div>
                    <div className="form-group">
                        <label htmlFor="email" className="label">الايميل:</label>
                        <input
                            type="text"
                            id="email"
                            name="email"
                            value={record.email}
                            onChange={handleChange}
                            className={`input ${validationErrors.email ? 'input-error' : ''}`}
                            placeholder="ادخل البريد الإلكتروني للعميل"
                            disabled={loading}
                        />
                        {validationErrors.email && (
                            <p className="error-message-inline">
                                <FontAwesomeIcon icon={faTimesCircle} className="error-icon-small" />
                                {validationErrors.email}
                            </p>
                        )}
                    </div>
                    <div className="form-group">
                        <label htmlFor="agency_id" className="label">رقم الوكالة الفائزة:</label>
                        <input
                            type="text"
                            id="agency_id"
                            name="agency_id"
                            value={record.agency_id}
                            onChange={handleChange}
                            className={`input ${validationErrors.agency_id ? 'input-error' : ''}`}
                            placeholder="ادخل رقم الوكالة"
                            disabled={loading}
                        />
                        {validationErrors.agency_id && (
                            <p className="error-message-inline">
                                <FontAwesomeIcon icon={faTimesCircle} className="error-icon-small" />
                                {validationErrors.agency_id}
                            </p>
                        )}
                    </div>
                    <div className="form-group">
                        <label htmlFor="prize_due_date" className="label">تاريخ استحقاق الجائزة:</label>
                        <div className="input-with-icon">
                            <input
                                type="date"
                                id="prize_due_date"
                                name="prize_due_date"
                                value={record.prize_due_date}
                                onChange={handleChange}
                                className="input"
                                disabled={loading}
                            />
                            <FontAwesomeIcon icon={faCalendarAlt} className="input-icon" />
                        </div>
                    </div>
                    <div className="form-group">
                        <input
                            type="checkbox"
                            id="name_verified"
                            name="name_verified"
                            checked={record.name_verified}
                            onChange={handleChange}
                            className="checkbox"
                            disabled={loading}
                        />
                        <label htmlFor="name_verified" className="checkbox-label">تم التأكد من اسم العميل في قائمة الفائزين</label>
                    </div>
                </div>

                <div className="form-section">
                    <h3 className="sub-heading"><FontAwesomeIcon icon={faCheckSquare} className="icon" /> 2. تحقق CRM</h3>
                    <div className="form-group">
                        <label htmlFor="crm_account_valid" className="label">هل تم التأكد من حالة الحساب في CRM (مؤهل/تم فتح حساب جديد)؟</label>
                        <div>
                            <input
                                type="checkbox"
                                id="crm_account_valid"
                                name="crm_account_valid"
                                checked={record.crm_account_valid}
                                onChange={handleChange}
                                className="checkbox"
                                disabled={loading}
                            />
                            <label htmlFor="crm_account_valid" className="checkbox-label">نعم، تم التأكد</label>
                        </div>
                    </div>
                    {record.crm_account_valid && (
                        <div className="form-group">
                            <label htmlFor="account_number" className="label">رقم الحساب المؤهل/الجديد:</label>
                            <input
                                type="text"
                                id="account_number"
                                name="account_number"
                                value={record.account_number}
                                onChange={handleChange}
                                className={`input ${validationErrors.account_number ? 'input-error' : ''}`}
                                placeholder="ادخل رقم الحساب"
                                disabled={loading}
                            />
                            {validationErrors.account_number && (
                                <p className="error-message-inline">
                                    <FontAwesomeIcon icon={faTimesCircle} className="error-icon-small" />
                                    {validationErrors.account_number}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className="form-section">
                    <h3 className="sub-heading"><FontAwesomeIcon icon={faBuilding} className="icon" /> 3. التحقق من تبعية الوكالة</h3>
                    <div className="form-group">
                        <input
                            type="checkbox"
                            id="agency_affiliation_verified"
                            name="agency_affiliation_verified"
                            checked={record.agency_affiliation_verified}
                            onChange={handleChange}
                            className="checkbox"
                            disabled={loading}
                        />
                        <label htmlFor="agency_affiliation_verified" className="checkbox-label">الحساب متسجل تحت الوكالة الفائزة</label>
                    </div>
                </div>

                <div className="form-section">
                    <h3 className="sub-heading"><FontAwesomeIcon icon={faCamera} className="icon" /> 4. تأكيد سكرين شوت MT5</h3>
                    <div className="form-group">
                        <input
                            type="checkbox"
                            id="mt5_screenshot_received"
                            name="mt5_screenshot_received"
                            checked={record.mt5_screenshot_received}
                            onChange={handleChange}
                            className="checkbox"
                            disabled={loading}
                        />
                        <label htmlFor="mt5_screenshot_received" className="checkbox-label">تم استلام سكرين شوت من منصة MT5</label>
                    </div>
                    <div className="form-group">
                        <label htmlFor="mt5_screenshot_notes" className="label">ملاحظات على سكرين شوت MT5 (اختياري):</label>
                        <textarea
                            id="mt5_screenshot_notes"
                            name="mt5_screenshot_notes"
                            value={record.mt5_screenshot_notes}
                            onChange={handleChange}
                            className="textarea"
                            placeholder="أضف أي ملاحظات هنا..."
                            disabled={loading}
                        ></textarea>
                    </div>
                </div>

                <div className="form-section">
                    <h3 className="sub-heading"><FontAwesomeIcon icon={faGift} className="icon" /> 5. تفاصيل الجائزة وتوليد الكليشة</h3>
                    <div className="form-group">
                        <label className="label">نوع الجائزة:</label>
                        <div className="radio-group">
                            <label className="radio-label">
                                <input
                                    type="radio"
                                    name="prize_type"
                                    value="بونص تداولي"
                                    checked={record.prize_type === 'بونص تداولي'}
                                    onChange={handleChange}
                                    className="radio-input"
                                    disabled={loading}
                                />
                                بونص تداولي
                            </label>
                            <label className="radio-label">
                                <input
                                    type="radio"
                                    name="prize_type"
                                    value="بونص ايداع"
                                    checked={record.prize_type === 'بونص ايداع'}
                                    onChange={handleChange}
                                    className="radio-input"
                                    disabled={loading}
                                />
                                بونص إيداع
                            </label>
                        </div>
                    </div>

                    {(record.prize_type === 'بونص تداولي' || record.prize_type === undefined) && ( 
                        <div className="form-group">
                            <label htmlFor="prize_amount" className="label">قيمة البونص التداولي:</label>
                            <div className="input-with-symbol">
                                <input
                                    type="number"
                                    id="prize_amount"
                                    name="prize_amount"
                                    value={record.prize_amount}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="ادخل قيمة البونص"
                                    disabled={loading}
                                />
                                <span className="currency-symbol">$</span>
                            </div>
                        </div>
                    )}

                    {record.prize_type === 'بونص ايداع' && (
                        <div className="form-group">
                            <label htmlFor="deposit_bonus_percentage" className="label">نسبة بونص الإيداع:</label>
                            <div className="input-with-symbol">
                                <input
                                    type="number"
                                    id="deposit_bonus_percentage"
                                    name="deposit_bonus_percentage"
                                    value={record.deposit_bonus_percentage}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="ادخل النسبة المئوية"
                                    disabled={loading}
                                />
                                <span className="currency-symbol">%</span>
                            </div>
                        </div>
                    )}
                    
                    <div className="form-group">
                        <label htmlFor="agent_name" className="label">اسم الوكيل:</label>
                        <input
                            type="text"
                            id="agent_name"
                            name="agent_name"
                            value={record.agent_name}
                            onChange={handleChange}
                            className="input"
                            placeholder="ادخل اسم الوكيل"
                            disabled={loading}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="agency_type" className="label">نوع الوكالة:</label>
                        <input
                            type="text"
                            id="agency_type"
                            name="agency_type"
                            value={record.agency_type}
                            onChange={handleChange}
                            className="input"
                            placeholder="ادخل نوع الوكالة"
                            disabled={loading}
                        />
                    </div>

                    <button className="btn btn-success btn-lg generate-klisha-button" onClick={handleGenerateKlisha} disabled={loading}>
                        <FontAwesomeIcon icon={faGift} /> إنهاء الفحص وتوليد رسالة الجروب
                    </button>
                </div>
            </div>
            
            {showKlishaModal && (
                <KlishaModal 
                    message={klishaMessage} 
                    onClose={() => setShowKlishaModal(false)} 
                    onPublishAndClose={handlePublishAndExit}
                />
            )}
        </div>
    );
}

export default VerificationPage;