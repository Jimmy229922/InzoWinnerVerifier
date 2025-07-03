// frontend/src/components/FilterModal.js

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faSearch,
    faFilter,
    faTimes,
    faSyncAlt
} from '@fortawesome/free-solid-svg-icons'; 
import './FilterModal.css';

function FilterModal({
    searchQuery: initialSearchQuery,
    filterStatus: initialFilterStatus,
    filterPublished: initialFilterPublished,
    searchFields: initialSearchFields,
    onApplyFilters,
    onClose
}) {
    const [currentSearchQuery, setCurrentSearchQuery] = useState(initialSearchQuery);
    const [currentFilterStatus, setCurrentFilterStatus] = useState(initialFilterStatus);
    const [currentFilterPublished, setCurrentFilterPublished] = useState(initialFilterPublished);

    const [currentSearchFields, setCurrentSearchFields] = useState(() => {
        const fieldsMap = {
            client_name: false,
            email: false,
            account_number: false,
            agency_id: false
        };
        initialSearchFields.forEach(field => {
            if (field in fieldsMap) fieldsMap[field] = true;
        });
        return fieldsMap;
    });

    const handleApply = () => {
        const selectedFields = Object.keys(currentSearchFields).filter(field => currentSearchFields[field]);
        onApplyFilters(currentSearchQuery, currentFilterStatus, currentFilterPublished, selectedFields);
    };

    const handleReset = () => {
        setCurrentSearchQuery('');
        setCurrentFilterStatus('الكل');
        setCurrentFilterPublished('الكل');
        setCurrentSearchFields({
            client_name: true,
            email: true,
            account_number: true,
            agency_id: true
        });
    };

    const handleCheckboxChange = (e) => {
        const { name, checked } = e.target;
        setCurrentSearchFields(prev => ({
            ...prev,
            [name]: checked
        }));
    };

    return (
        <div className="filter-modal-overlay">
            <div className="filter-modal">
                <div className="modal-header">
                    <h3 className="modal-title">
                        <FontAwesomeIcon icon={faFilter} className="icon" /> تصفية الفائزين
                    </h3>
                    <button className="modal-close-button" onClick={onClose}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>
                
                <div className="modal-body">
                    {/* Search Input */}
                    <div className="modal-search-group">
                        <input
                            type="text"
                            className="modal-search-input"
                            placeholder="ابحث هنا..."
                            value={currentSearchQuery}
                            onChange={(e) => setCurrentSearchQuery(e.target.value)}
                        />
                        <FontAwesomeIcon icon={faSearch} className="search-icon" />
                        {currentSearchQuery && (
                            <button className="clear-search-button" onClick={() => setCurrentSearchQuery('')}>
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        )}
                    </div>

                    {/* Search Fields Checkboxes */}
                    <div className="modal-filter-section">
                        <h4 className="filter-section-title">البحث في الحقول:</h4>
                        <div className="checkbox-group">
                            <label className="checkbox-label-modal">
                                <input
                                    type="checkbox"
                                    name="client_name"
                                    checked={currentSearchFields.client_name}
                                    onChange={handleCheckboxChange}
                                    className="modal-checkbox"
                                />
                                اسم الفائز الثلاثي
                            </label>
                            <label className="checkbox-label-modal">
                                <input
                                    type="checkbox"
                                    name="email"
                                    checked={currentSearchFields.email}
                                    onChange={handleCheckboxChange}
                                    className="modal-checkbox"
                                />
                                البريد الإلكتروني
                            </label>
                            <label className="checkbox-label-modal">
                                <input
                                    type="checkbox"
                                    name="account_number"
                                    checked={currentSearchFields.account_number}
                                    onChange={handleCheckboxChange}
                                    className="modal-checkbox"
                                />
                                رقم الحساب
                            </label>
                            <label className="checkbox-label-modal">
                                <input
                                    type="checkbox"
                                    name="agency_id"
                                    checked={currentSearchFields.agency_id}
                                    onChange={handleCheckboxChange}
                                    className="modal-checkbox"
                                />
                                رقم الوكالة
                            </label>
                        </div>
                    </div>

                    {/* Status Filter */}
                    <div className="modal-filter-section">
                        <h4 className="filter-section-title">الحالة:</h4>
                        <select
                            className="modal-select"
                            value={currentFilterStatus}
                            onChange={(e) => setCurrentFilterStatus(e.target.value)}
                        >
                            <option value="الكل">الكل</option>
                            <option value="جاري">جاري</option>
                            <option value="مكتمل">مكتمل</option>
                        </select>
                    </div>

                    {/* Published Filter */}
                    <div className="modal-filter-section">
                        <h4 className="filter-section-title">تم النشر؟</h4>
                        <select
                            className="modal-select"
                            value={currentFilterPublished}
                            onChange={(e) => setCurrentFilterPublished(e.target.value)}
                        >
                            <option value="الكل">الكل</option>
                            <option value="true">نعم</option>
                            <option value="false">لا</option>
                        </select>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="apply-filters-modal-button" onClick={handleApply}>
                        <FontAwesomeIcon icon={faSearch} className="icon" /> تطبيق الفلاتر
                    </button>
                    <button className="reset-filters-modal-button" onClick={handleReset}>
                        <FontAwesomeIcon icon={faSyncAlt} className="icon" /> إعادة تعيين الفلاتر
                    </button>
                </div>
            </div>
        </div>
    );
}

export default FilterModal;