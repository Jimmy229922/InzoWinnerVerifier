
from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import uuid  # For generating unique IDs
from datetime import datetime, date # To add creation and update timestamps, and for date comparisons

app = Flask(__name__)
CORS(app) # Enable CORS for all routes, allowing React app to communicate

# Define the path to your data file
DATA_FILE = 'data.json'

# --- Helper Functions for Data Persistence ---

def load_data():
    """Loads all verification records and pending issues from the JSON file."""
    if not os.path.exists(DATA_FILE):
        # Initialize with both sections if file doesn't exist
        print(f"INFO: {DATA_FILE} not found. Creating with initial structure.")
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump({"verifications": [], "pending_issues": []}, f) 
        return {"verifications": [], "pending_issues": []}

    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        try:
            data = json.load(f)
            # Ensure both sections exist, initialize if missing or if root is not a dict
            if not isinstance(data, dict):
                print(f"Warning: {DATA_FILE} root is not a dict. Resetting data.")
                return {"verifications": [], "pending_issues": []}
            data.setdefault("verifications", [])
            data.setdefault("pending_issues", [])
            print(f"INFO: Data loaded from {DATA_FILE}. Verifications: {len(data['verifications'])}, Pending Issues: {len(data['pending_issues'])}")
            return data
        except json.JSONDecodeError:
            print(f"Warning: {DATA_FILE} is empty or corrupted. Initializing with empty data.")
            return {"verifications": [], "pending_issues": []}

def save_data(data):
    """Saves the current application data to the JSON file."""
    with open(DATA_FILE, 'w', encoding='utf-8') as f: # Use utf-8 for Arabic characters
        json.dump(data, f, indent=4, ensure_ascii=False)
    print(f"INFO: Data saved to {DATA_FILE}. Verifications: {len(data.get('verifications',[]))}, Pending Issues: {len(data.get('pending_issues',[]))}")


# --- API Endpoints for Verifications (Existing) ---

@app.route('/')
def home():
    """Simple route to check if the backend is running."""
    return "Backend is running!"

@app.route('/api/verifications', methods=['GET'])
def get_verifications():
    """
    Retrieves all stored verification records, with optional search and filter parameters.
    Search by: client_name, email, agency_id, account_number (based on search_fields).
    Filter by: status, prize_published_on_group, prize_due_date.
    """
    app_data = load_data()
    records = app_data.get("verifications", []) # Access 'verifications' list

    # Get search/filter parameters from request arguments
    search_query = request.args.get('query', '').lower().strip() # General search term
    search_fields_param = request.args.get('search_fields', '').lower().strip()
    search_fields = [field.strip() for field in search_fields_param.split(',') if field.strip()] if search_fields_param else []

    filter_status = request.args.get('status')
    filter_published = request.args.get('published')
    filter_due_date = request.args.get('prize_due_date') # Get prize_due_date filter

    filtered_records = []
    for record in records:
        match = True

        record.setdefault('prize_published_on_group', False) 
        record.setdefault('prize_due_date', '') 
        record.setdefault('status', 'جاري') # Ensure status is always present

        # --- General Search Logic (case-insensitive) ---
        if search_query:
            record_matches_query = False
            if search_fields:
                for field in search_fields:
                    if field in record and search_query in str(record.get(field, '')).lower():
                        record_matches_query = True
                        break
            else:
                # Default search fields if none are specified
                if search_query in record.get('client_name', '').lower() or \
                   search_query in record.get('email', '').lower() or \
                   search_query in record.get('agency_id', '').lower() or \
                   search_query in record.get('account_number', '').lower() or \
                   search_query in record.get('prize_due_date', '').lower():
                    record_matches_query = True
            
            if not record_matches_query:
                match = False

        # --- Filter by Status ---
        if filter_status and filter_status != 'الكل':
            if record.get('status') != filter_status:
                match = False

        # --- Filter by Published Status ---
        if filter_published is not None and filter_published != 'الكل':
            target_published_status = filter_published.lower() == 'true'
            if record.get('prize_published_on_group') != target_published_status:
                match = False
        
        # Filter by Prize Due Date (separate filter)
        if filter_due_date: # Only filter if a date is provided
            if record.get('prize_due_date') != filter_due_date:
                match = False

        if match:
            filtered_records.append(record)

    # Add pagination and sorting logic if not already handled by frontend
    sort_by = request.args.get('sort_by')
    sort_direction = request.args.get('sort_direction', 'asc')

    if sort_by:
        def get_sort_key(item):
            value = item.get(sort_by, '')
            if sort_by in ['prize_due_date', 'updated_at'] and value:
                try:
                    return datetime.fromisoformat(value)
                except ValueError:
                    return datetime.min # Handle invalid dates
            elif isinstance(value, (int, float)):
                return value
            return str(value).lower() # Default to string comparison

        filtered_records.sort(key=get_sort_key, reverse=(sort_direction == 'desc'))

    # Pagination 
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 10))
    
    start_index = (page - 1) * limit
    end_index = start_index + limit
    
    paginated_records = filtered_records[start_index:end_index]

    # Return an object with 'records' and 'total_count' keys
    return jsonify({
        'records': paginated_records,
        'total_count': len(filtered_records) 
    })


@app.route('/api/verifications', methods=['POST'])
def create_verification():
    """
    Creates a new verification record.
    Initializes required fields with default values to avoid KeyError later.
    """
    new_record_data = request.json if request.json else {}
    app_data = load_data() # Load all data
    records = app_data.get("verifications", []) # Access 'verifications' list
    
    new_record = {
        'id': str(uuid.uuid4()),
        'status': 'جاري',
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat(),
        
        'client_name': new_record_data.get('client_name', ''),
        'email': new_record_data.get('email', ''),
        'account_number': new_record_data.get('account_number', ''),
        'prize_amount': new_record_data.get('prize_amount', 0),
        'agent_name': new_record_data.get('agent_name', ''),
        'agency_type': new_record_data.get('agency_type', ''),
        'agency_id': new_record_data.get('agency_id', ''),
        
        'name_verified': new_record_data.get('name_verified', False),
        'crm_account_valid': new_record_data.get('crm_account_valid', False),
        'mt5_screenshot_received': new_record_data.get('mt5_screenshot_received', False),
        'agency_affiliation_verified': new_record_data.get('agency_affiliation_verified', False),
        'mt5_screenshot_notes': new_record_data.get('mt5_screenshot_notes', ''),
        
        'prize_type': new_record_data.get('prize_type', 'بونص تداولي'),
        'deposit_bonus_percentage': new_record_data.get('deposit_bonus_percentage', 0),
        'competition_name': new_record_data.get('competition_name', 'غير محدد'),

        'prize_published_on_group': new_record_data.get('prize_published_on_group', False), 
        'prize_due_date': new_record_data.get('prize_due_date', ''),
    }

    records.append(new_record)
    app_data["verifications"] = records # Update the verifications list in app_data
    save_data(app_data) # Save the entire app_data
    return jsonify(new_record), 201


@app.route('/api/verifications/<string:record_id>', methods=['GET'])
def get_verification(record_id):
    """Retrieves a single verification record by its ID."""
    app_data = load_data()
    records = app_data.get("verifications", []) # Access 'verifications' list
    record = next((r for r in records if r['id'] == record_id), None)
    if record:
        record.setdefault('prize_published_on_group', False) 
        record.setdefault('prize_due_date', '') 
        record.setdefault('status', 'جاري')
        return jsonify(record)
    return jsonify({"message": "Record not found"}), 404


@app.route('/api/verifications/<string:record_id>', methods=['PUT'])
def update_verification(record_id):
    """Updates an existing verification record by its ID."""
    updated_data = request.json
    app_data = load_data() # Load all data
    records = app_data.get("verifications", []) # Access 'verifications' list
    for i, record_in_list in enumerate(records):
        if record_in_list['id'] == record_id:
            records[i].update(updated_data)
            records[i]['updated_at'] = datetime.now().isoformat() 
            app_data["verifications"] = records # Update the verifications list in app_data
            save_data(app_data) # Save the entire app_data
            return jsonify(records[i])
    return jsonify({"message": "Record not found"}), 404

@app.route('/api/verifications/<string:record_id>', methods=['DELETE'])
def delete_verification(record_id):
    """Deletes a verification record by its ID."""
    app_data = load_data() # Load all data
    records = app_data.get("verifications", []) # Access 'verifications' list
    initial_len = len(records)
    records = [r for r in records if r['id'] != record_id]
    
    if len(records) < initial_len:
        app_data["verifications"] = records # Update the verifications list in app_data
        save_data(app_data) # Save the entire app_data
        return jsonify({"message": "Record deleted successfully"}), 200
    return jsonify({"message": "Record not found"}), 404

# NEW: Endpoint for bulk deletion (if needed in the future)
@app.route('/api/verifications/bulk', methods=['DELETE'])
def delete_bulk_verifications():
    """Deletes multiple verification records by their IDs."""
    ids_to_delete = request.json.get('ids', [])
    app_data = load_data() # Load all data
    records = app_data.get("verifications", []) # Access 'verifications' list
    initial_len = len(records)
    
    records = [r for r in records if r['id'] not in ids_to_delete]
    
    if len(records) < initial_len:
        app_data["verifications"] = records # Update the verifications list in app_data
        save_data(app_data) # Save the entire app_data
        return jsonify({"message": f"{initial_len - len(records)} records deleted successfully"}), 200
    return jsonify({"message": "No records found for deletion"}), 404


@app.route('/api/generate-klisha/<string:record_id>', methods=['GET'])
def generate_klisha(record_id):
    """Generates the final Klisha (message) for a winner based on their record ID."""
    app_data = load_data() # Load all data
    records = app_data.get("verifications", []) # Access 'verifications' list
    record = next((r for r in records if r['id'] == record_id), None)
    if not record:
        return jsonify({"message": "Record not found"}), 404

    record.setdefault('prize_published_on_group', False) 
    record.setdefault('prize_due_date', '') 

    client_name = record.get('client_name', '')
    email = record.get('email', '')
    account_number = record.get('account_number', '')
    prize_amount = record.get('prize_amount', 0)
    agent_name = record.get('agent_name', '')
    agency_type = record.get('agency_type', '')
    agency_id = record.get('agency_id', '')
    prize_type = record.get('prize_type', 'بونص تداولي')
    deposit_bonus_percentage = record.get('deposit_bonus_percentage', 0)
    
    prize_details = ""
    if prize_type == 'بونص إيداع':
        prize_details = f"بونص إيداع بنسبة {deposit_bonus_percentage}%"
    else:
        prize_details = f"{prize_amount}$"

    klisha = f"""الاسم: {client_name}
الايميل: {email}
رقم الحساب: {account_number}
الجائزة: {prize_details}
اسم الوكيل: {agent_name}
نوع الوكالة: {agency_type}
رقم الوكالة: {agency_id}

فائز عن المسابقة
تم التحقق من التحويل"""
    return jsonify({"klisha": klisha})


@app.route('/api/dashboard-stats', methods=['GET'])
def get_dashboard_stats():
    """
    Retrieves statistics for the dashboard:
    - Number of in-progress verifications.
    - Number of completed verifications today.
    - Number of prizes published on group.
    - Total records count.
    """
    app_data = load_data() # Load all data
    records = app_data.get("verifications", []) # Access 'verifications' list
    
    in_progress_count = sum(1 for record in records if record.get('status') == 'جاري')

    today_date = date.today()
    completed_today_count = 0
    
    prize_published_count = 0 
    total_records = len(records)

    # Calculate completed today and published count
    for record in records:
        record.setdefault('prize_published_on_group', False) 
        record.setdefault('prize_due_date', '') 
        record.setdefault('status', 'جاري')
        
        if record.get('status') == 'مكتمل':
            try:
                record_updated_date = datetime.fromisoformat(record.get('updated_at')).date()
                if record_updated_date == today_date:
                    completed_today_count += 1
            except (TypeError, ValueError):
                pass
        
        if record.get('prize_published_on_group') == True:
            prize_published_count += 1

    return jsonify({
        'in_progress_count': in_progress_count,
        'completed_today_count': completed_today_count,
        'prize_published_count': prize_published_count,
        'total_records': total_records
    })

# --- NEW: API Endpoints for Pending Issues ---
@app.route('/api/pending-issues', methods=['GET'])
def get_pending_issues():
    """Retrieves all pending issues."""
    app_data = load_data()
    issues = app_data.get("pending_issues", []) # Access 'pending_issues' list
    
    # **NEW: إضافة فلترة حسب الحالة**
    status_filter = request.args.get('status_filter') # 'معلقة', 'تم الحل', 'الكل'
    if status_filter and status_filter != 'الكل':
        issues = [issue for issue in issues if issue.get('status') == status_filter]

    print(f"INFO: get_pending_issues called. Returning {len(issues)} issues.") # Debugging print
    return jsonify(issues)

@app.route('/api/pending-issues', methods=['POST'])
def add_pending_issue():
    """Adds a new pending issue."""
    new_issue_data = request.json
    app_data = load_data()
    issues = app_data.get("pending_issues", []) # Access 'pending_issues' list

    new_issue = {
        "id": str(uuid.uuid4()),
        "client_name": new_issue_data.get("client_name", ""),
        "client_id": new_issue_data.get("client_id", ""), # المعرف الخاص بالعميل
        "description": new_issue_data.get("description", ""), # وصف المشكلة/السبب
        "status": "معلقة", # يمكن أن تكون "معلقة", "تم الحل", "قيد المراجعة"
        "is_sent_to_group": False, # **NEW: خاصية جديدة لتحديد ما إذا تم إرسالها للجروب**
        "created_at": datetime.now().isoformat(),
        "resolved_at": None,
        "sent_at": None # **NEW: تاريخ ووقت الإرسال للجروب**
    }
    issues.append(new_issue)
    app_data["pending_issues"] = issues # Update the pending_issues list in app_data
    save_data(app_data) # Save the entire app_data
    print(f"INFO: add_pending_issue called. Added issue for {new_issue['client_name']}. Total issues: {len(issues)}.") # Debugging print
    return jsonify(new_issue), 201

@app.route('/api/pending-issues/<string:issue_id>', methods=['PUT'])
def update_pending_issue(issue_id):
    """Updates an existing pending issue."""
    updated_data = request.json
    app_data = load_data()
    issues = app_data.get("pending_issues", []) # Access 'pending_issues' list

    for i, issue in enumerate(issues):
        if issue['id'] == issue_id:
            issues[i].update(updated_data)
            if updated_data.get("status") == "تم الحل":
                issues[i]["resolved_at"] = datetime.now().isoformat()
            # **NEW: تحديث خاصية is_sent_to_group و sent_at**
            if "is_sent_to_group" in updated_data:
                issues[i]["is_sent_to_group"] = updated_data["is_sent_to_group"]
                if updated_data["is_sent_to_group"] and not issues[i].get("sent_at"): # سجل وقت الإرسال فقط عند أول إرسال
                    issues[i]["sent_at"] = datetime.now().isoformat()
                elif not updated_data["is_sent_to_group"]: # إذا تم إلغاء الإرسال، أعد تعيين الوقت
                    issues[i]["sent_at"] = None

            app_data["pending_issues"] = issues # Update the pending_issues list in app_data
            save_data(app_data) # Save the entire app_data
            print(f"INFO: update_pending_issue called. Updated issue {issue_id}. New status: {issues[i].get('status')}.") # Debugging print
            return jsonify(issues[i])
    print(f"WARNING: update_pending_issue called for {issue_id} but not found.") # Debugging print
    return jsonify({"message": "Pending issue not found"}), 404

# **NEW: مسار جديد لتحديث مجموعة من المعلقات كـ "تم الإرسال للجروب"**
@app.route('/api/pending-issues/mark-sent', methods=['PUT'])
def mark_pending_issues_sent():
    """Marks multiple pending issues as sent to group."""
    issue_ids = request.json.get('ids', [])
    app_data = load_data()
    issues = app_data.get("pending_issues", [])
    updated_count = 0

    for i, issue in enumerate(issues):
        if issue['id'] in issue_ids:
            # **NEW: تحديث فقط إذا لم يتم إرسالها بالفعل**
            if not issue.get("is_sent_to_group"): 
                issues[i]["is_sent_to_group"] = True
                issues[i]["sent_at"] = datetime.now().isoformat()
                updated_count += 1
    
    if updated_count > 0:
        app_data["pending_issues"] = issues
        save_data(app_data)
        print(f"INFO: mark_pending_issues_sent called. Marked {updated_count} issues as sent.")
        return jsonify({"message": f"{updated_count} issues marked as sent successfully"}), 200
    print(f"WARNING: mark_pending_issues_sent called. No issues found or updated.") # Debugging print
    return jsonify({"message": "No issues found or updated"}), 404


@app.route('/api/pending-issues/<string:issue_id>', methods=['DELETE'])
def delete_pending_issue(issue_id):
    """Deletes a pending issue."""
    app_data = load_data()
    issues = app_data.get("pending_issues", []) # Access 'pending_issues' list
    initial_len = len(issues)
    issues = [issue for issue in issues if issue['id'] != issue_id]

    if len(issues) < initial_len:
        app_data["pending_issues"] = issues
        save_data(app_data)
        print(f"INFO: delete_pending_issue called. Deleted issue {issue_id}. Total issues: {len(issues)}.") # Debugging print
        return jsonify({"message": "Pending issue deleted successfully"}), 200
    print(f"WARNING: delete_pending_issue called for {issue_id} but not found.") # Debugging print
    return jsonify({"message": "Pending issue not found"}), 404


if __name__ == '__main__':
    app.run(debug=True, port=5000)