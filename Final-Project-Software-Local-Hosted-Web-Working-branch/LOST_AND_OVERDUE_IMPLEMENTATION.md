# Lost & Overdue Book Workflow Implementation

## Overview
This document describes the complete implementation of lost book, overdue simulation, and found book workflows in the Athenaeum Library Management System. These features allow librarians to test and demonstrate the system's handling of books that become overdue, are marked as lost, and can later be found.

---

## Features Implemented

### 1. **Overdue Book Simulation (Testing Feature)**
- **Purpose**: Test the system without waiting for real time to pass
- **Location**: Loans tab, "TEST: Overdue" button on ACTIVE loans
- **Behavior**: 
  - Sets loan due date to 7 days in the past
  - Automatically calculates fine: 7 days × $0.50/day = $3.50
  - Marks loan status as OVERDUE
  - Charges fine to patron's fine_balance
  - Logs action in audit_log with "[TEST]" prefix

### 2. **Lost Book Workflow**
- **Entry Point**: Loans or Overdue tabs, "Lost" button
- **Behavior**:
  - Marks loan status as LOST
  - Marks book status as LOST
  - Charges patron replacement fee (book.cost)
  - Decrements patron's book count
  - Logs action with replacement cost in audit_log
  - Book disappears from available inventory

### 3. **Found Book Workflow**
- **Entry Point**: Overdue tab, "Found" button (only visible on LOST loans)
- **Behavior**:
  - Marks loan status as RETURNED
  - Reduces patron's fine by 50%
  - Sets book status back to IN (available)
  - Logs action showing fine reduction in audit_log
  - Book returns to available inventory

### 4. **Enhanced Overdue Tab**
- **Shows**: Both OVERDUE and LOST loans
- **Status Badges**: 
  - OVERDUE loans show days overdue (red badge)
  - LOST loans show "LOST" status (error badge)
- **Actions per Status**:
  - OVERDUE: Check In, Lost
  - LOST: Found

---

## Files Modified

### Backend

#### 1. `backend/routes/loans.js`

**Key Changes:**

a) **GET /api/loans/overdue endpoint modified**
   - Changed WHERE clause to include LOST loans
   ```sql
   WHERE  l.status IN ('OVERDUE', 'LOST')
   ```
   - Previously only returned status = 'OVERDUE'

b) **POST /api/loans/test/simulate-overdue endpoint added**
   - **Route**: Moved BEFORE parameterized routes (critical for Express routing)
   - **Purpose**: Test endpoint for simulating overdue loans
   - **Input**: JSON body `{ id: loanId }`
   - **Logic**:
     - Validates loan exists and is ACTIVE or OVERDUE (not RETURNED or LOST)
     - Calculates fine: 7 days × $0.50/day = $3.50
     - Sets due_date to 7 days in the past
     - Updates loan status to OVERDUE
     - Adds fine to patron's fine_balance
     - Logs with "[TEST]" prefix for audit trail
   - **Response**: Returns calculated fine, days overdue, and new due date

c) **POST /api/loans/:id/lost endpoint enhanced**
   - Added validation to prevent marking returned or already-lost loans
   - Fetches patron and book info for comprehensive audit logging
   - Audit log now includes replacement fee amount
   - Error handling for invalid state transitions

d) **POST /api/loans/:id/renew endpoint updated**
   - Added check: Cannot renew LOST loans (previously only blocked RETURNED)
   - Prevents logical error of renewing lost books

e) **Route Ordering (Critical)**
   - Test endpoint (`/test/simulate-overdue`) placed BEFORE parameterized routes (`/:id/...`)
   - Express evaluates routes in order; specific paths must come before wildcards
   - Without this, `/test/simulate-overdue` matches `/:id` with id="test" and fails

---

### Frontend

#### 1. `frontend/js/api.js`

**Changes:**

a) **Added Loans.testSimulateOverdue method**
   ```javascript
   testSimulateOverdue: (id) => apiFetch('/loans/test/simulate-overdue', { 
     method: 'POST', 
     body: JSON.stringify({ id }) 
   }),
   ```
   - Uses POST with JSON body (not query params)
   - Sends loan ID in request body for cleaner API design

---

#### 2. `frontend/js/loans.js`

**Major Changes:**

a) **loadLoans() function enhanced**
   - Added "TEST: Overdue" button for ACTIVE loans
   ```javascript
   ${l.status === 'ACTIVE' ? `
     // ... existing buttons ...
     <button class="btn btn-ghost btn-sm" style="color:var(--orange);font-size:10px" 
       onclick="doTestOverdue(${l.id})">TEST: Overdue</button>
   `}
   ```
   - Button only appears on ACTIVE loans
   - Styled differently (smaller font, orange color) to indicate testing feature
   - Conditionally shows different action buttons based on loan status

b) **loadOverdue() function completely rewritten**
   - Now handles BOTH OVERDUE and LOST loans
   - Distinguishes between statuses with conditional rendering:
   ```javascript
   const isLost = l.status === 'LOST';
   ```
   - LOST loans display:
     - "LOST" label under book title (red, small text)
     - "LOST" error badge (instead of days overdue)
     - "Found" button (green, bold)
   - OVERDUE loans display:
     - Days overdue count
     - Check In and Lost buttons
   - Improved visual hierarchy with bold text for lost books

c) **doTestOverdue() function added**
   - New function to handle test overdue workflow
   - Confirmation dialog warns user this is a test action
   - Calls Loans.testSimulateOverdue(loanId)
   - Reloads multiple tables on success:
     - Loans table
     - Overdue table
     - Fines table
     - Dashboard
   - Shows user-friendly toast message with calculated fine

d) **doMarkLost() function enhanced**
   - Now reloads Fines table after marking lost (was missing)
   - Ensures fine_balance updates immediately in UI

e) **doFoundBook() function enhanced**
   - Now reloads Fines table after marking found (was missing)
   - Shows toast message with before/after fine amounts
   - Updates all relevant tables

f) **loadFines() function minor enhancement**
   - No code changes, but better integration with other functions
   - Reloads whenever loan status changes

---

## Data Flow Examples

### Example 1: Test Overdue Workflow
```
1. User views Loans tab
   - Sees loan #5: "The Great Gatsby", Status: ACTIVE, Due: Apr 21, 2026

2. User clicks "TEST: Overdue" button
   - Confirmation: "This loan will be marked as 7 days overdue for testing..."

3. Backend processes /loans/test/simulate-overdue
   - Calculates: 7 days × $0.50 = $3.50 fine
   - Updates loans: status=OVERDUE, due_date=2026-04-01, fine_amount=3.50
   - Updates patrons: fine_balance += 3.50
   - Inserts audit log: "[TEST] Mason B - 'The Great Gatsby' simulated as 7 days overdue. Fine: $3.50"

4. Frontend reloads all views
   - Loan disappears from active (ACTIVE filter)
   - Loan appears in Overdue tab with fine $3.50
   - Fines tab shows updated patron balance

5. User can now test:
   - Check in the overdue book (charges original fine)
   - Mark it as lost (charges replacement fee)
   - etc.
```

### Example 2: Lost → Found Workflow
```
1. User has ACTIVE loan, clicks "Lost"
   - Backend: marks loan LOST, book LOST, charges replacement fee
   - Example: Book costs $25, charged to patron
   - Patron fine_balance = $25.00

2. User goes to Overdue tab, sees LOST badge, clicks "Found"
   - Backend calculates: $25 × 0.5 = $12.50 (50% reduction)
   - Refund amount: $25 - $12.50 = $12.50
   - Updates: fine_balance = $25 - $12.50 = $12.50
   - Sets book status back to IN
   - Marks loan as RETURNED

3. Patron now owes only $12.50 instead of $25.00
   - Audit log shows: "Found lost book 'The Great Gatsby'. Fine reduced from $25.00 to $12.50"
```

---

## Database Changes

### No schema changes required
All existing database columns are used:
- `loans.status`: 'ACTIVE' → 'OVERDUE' → 'LOST' → 'RETURNED'
- `loans.fine_amount`: Calculated and stored
- `loans.due_date`: Modified by test endpoint
- `books.status`: 'IN', 'OUT', 'LOST' (existing values)
- `patrons.fine_balance`: Accumulated fines
- `audit_log`: Records all actions with [TEST] prefix

---

## API Endpoints

### New Endpoint

**POST /api/loans/test/simulate-overdue**
- **Purpose**: Test feature only - simulates a loan becoming overdue
- **Input**: `{ id: loanId }`
- **Validates**:
  - Loan exists
  - Loan status is ACTIVE or OVERDUE (not RETURNED or LOST)
- **Output**:
  ```json
  {
    "message": "Loan simulated as overdue (testing)",
    "days_overdue": 7,
    "fine_calculated": 3.50,
    "new_due_date": "2026-04-01"
  }
  ```
- **Side Effects**:
  - Updates loan due_date and status
  - Updates patron fine_balance
  - Inserts audit log entry

### Modified Endpoints

**GET /api/loans/overdue**
- **Change**: WHERE clause now includes LOST loans
- **Before**: `WHERE l.status = 'OVERDUE'`
- **After**: `WHERE l.status IN ('OVERDUE', 'LOST')`
- **Impact**: Overdue tab displays both overdue and lost books

**POST /api/loans/:id/renew**
- **Change**: Added validation to prevent renewing LOST loans
- **Before**: Only checked if loan status = RETURNED
- **After**: Also checks if status = LOST, returns error if true

**POST /api/loans/:id/lost**
- **Change**: Enhanced validation and audit logging
- **Added**: Validation to prevent state transitions from RETURNED or LOST
- **Added**: Comprehensive audit log with replacement fee amount

---

## Frontend UI Changes

### Loans Tab
- Added "TEST: Overdue" button (orange, small text)
- Only shows on ACTIVE loans
- Shows different action buttons based on status:
  - ACTIVE: Check In, Renew, Lost, TEST: Overdue
  - OVERDUE: Check In, Lost
  - RETURNED: (no action buttons)
  - LOST: (no action buttons in this tab)

### Overdue Tab
- **Complete redesign** to handle both OVERDUE and LOST loans
- **OVERDUE loans**: Show days overdue (e.g., "5 days"), red badge
- **LOST loans**: Show "LOST" label under title, error badge, bold text
- **Actions**:
  - OVERDUE: Check In, Lost buttons
  - LOST: Found button (50% fine reduction)

### Fines Tab
- No UI changes, but now refreshes when loans change status
- Shows updated fine_balance after any loan operation

---

## Validation Rules

### Test Overdue Endpoint
- ✅ Loan must exist
- ✅ Loan status must be ACTIVE or OVERDUE
- ❌ Cannot mark RETURNED loans as overdue (business logic)
- ❌ Cannot mark LOST loans as overdue (already lost)

### Mark Lost Endpoint
- ✅ Loan must exist
- ❌ Cannot mark RETURNED loans as lost
- ❌ Cannot mark already LOST loans as lost

### Mark Found Endpoint
- ✅ Loan must exist
- ✅ Loan status must be LOST
- ❌ Cannot mark non-LOST loans as found

### Renew Endpoint
- ❌ Cannot renew RETURNED loans
- ❌ Cannot renew LOST loans (added)

---

## Testing Workflow

### Manual Testing Steps

1. **Setup**: Create a test patron and checkout a book (14-day loan)

2. **Test Overdue Simulation**:
   - Go to Loans tab
   - Click "TEST: Overdue" on the active loan
   - Confirm the dialog
   - Verify loan moves to Overdue tab with $3.50 fine
   - Check Fines tab for updated patron balance

3. **Test Lost Book**:
   - Go to Loans tab, checkout another book
   - Click "Lost"
   - Verify book disappears from available inventory
   - Check Fines tab for replacement fee charge

4. **Test Found Book**:
   - Go to Overdue tab
   - See LOST book with red badge
   - Click "Found"
   - Verify fine reduced by 50%
   - Verify book returns to IN status

5. **Test Audit Trail**:
   - Go to Dashboard → Activity Log
   - Verify [TEST] entries appear for test actions
   - Verify LOST and FOUND entries show dollar amounts

---

## Code Quality & Best Practices

### 1. Route Ordering (Express Best Practice)
- Specific routes placed BEFORE parameterized routes
- Prevents accidental matching of literal routes to parameters
- Comments added to document this critical requirement

### 2. Error Handling
- All state transitions validated
- Prevents impossible states (e.g., renewing a lost book)
- User-friendly error messages returned

### 3. Audit Trail
- All significant actions logged with context
- [TEST] prefix distinguishes test actions from real operations
- Includes patron names, book titles, and financial amounts

### 4. Database Transactions
- All multi-step operations wrapped in BEGIN/COMMIT/ROLLBACK
- Ensures atomicity (all-or-nothing)
- Prevents partial updates

### 5. UI/UX Improvements
- Conditional button display based on status
- Visual distinction between overdue and lost (badges, colors)
- Status-appropriate actions only shown
- Toast notifications provide user feedback

---

## Testing in Production

### Safety Measures
- Test endpoint requires explicit loan ID (not discoverable)
- Test actions logged with [TEST] prefix in audit trail
- Can be disabled by removing the route before production deployment
- Fine amounts match business logic ($0.50/day)

### Recommended Usage
1. Use with development/staging environment
2. Run before each release to verify workflows
3. Before production, either:
   - Remove the `/test/simulate-overdue` endpoint
   - Add authentication check to restrict to admins only

---

## Future Enhancements

### Potential Improvements
1. Add admin panel to toggle test endpoints on/off
2. Bulk mark overdue feature (mark multiple loans at once)
3. Fine waiver functionality (admin can reduce fines)
4. SMS/Email notifications when books become overdue
5. Automatic fine escalation after N days overdue
6. Partial payment support for fine_balance

---

## Rollback Instructions

If issues arise, revert to previous version:

```bash
# Undo last 3 commits
git revert HEAD~2..HEAD

# Or cherry-pick specific changes:
git revert [commit-hash]
```

Key files to verify after rollback:
- `backend/routes/loans.js`
- `frontend/js/api.js`
- `frontend/js/loans.js`

---

## Deployment Checklist

- [ ] Test all three workflows in staging
- [ ] Verify audit logs contain expected entries
- [ ] Check database for no orphaned records
- [ ] Confirm patron fine_balance calculations are correct
- [ ] Review performance of /loans/overdue endpoint
- [ ] Test with multiple concurrent users
- [ ] Verify responsive design on mobile
- [ ] Document test endpoint in admin guide
- [ ] Consider removing /test endpoint before production or adding auth

---

## Questions?

For questions about this implementation, refer to:
1. Inline code comments in backend/routes/loans.js
2. Frontend function documentation in frontend/js/loans.js
3. API contract in frontend/js/api.js

