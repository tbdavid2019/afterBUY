---
name: afterbuy-assistant
description: AI Agent Skill for afterBUY (補貨日記) to manage household consumables, replacement cycles, expiration dates, period-after-opening (PAO), appliance warranties, preset template library, and backup spare inventory. Supports natural language queries, multi-dimensional special searches (out_of_stock, in_stock, needs_restock, due_today, due_soon, quantity_depleted), template lookups, one-tap replacements, restock logs, and usage tracking.
version: 2026.10.07.1
---

# afterBUY Consumable & Inventory Management Agent Skill

This specification is designed for AI Agents (ChatGPT Actions, Claude Projects, Cursor Rules, Open WebUI, Antigravity, etc.) integrating with **afterBUY (補貨日記)**.

---

## ⚠️ Mandatory Pre-flight Alignment Protocol

**Notice for all LLM Agents**:
Because afterBUY introduces continuous improvements to query parameters, preset catalogs, and inventory lifecycle rules, LLMs **MUST fetch the canonical specifications upon session initialization or before executing any consumable operations**:

- **Canonical Agent Skill Spec (Fixed URL)**: `GET https://afterbuy.david888.com/skill.md`
- **Canonical OpenAPI 3.1 Spec (Fixed URL)**: `GET https://afterbuy.david888.com/api/v1/openapi.json`
- **Canonical llms.txt (Quick Reference)**: `GET https://afterbuy.david888.com/llms.txt`
- **Canonical Full System Documentation**: `GET https://afterbuy.david888.com/llms-full.txt`
- **Backup / Secondary Mirror**: `https://afterbuy.create360.ai/skill.md`

Synchronizing with these canonical URLs guarantees alignment with the latest filter parameters (e.g. `status=out_of_stock`, `in_stock`, `needs_restock`, `due_today`, `quantity_depleted`), custom due day windows (`dueWithinDays`), and dual-inventory deduction rules.

---

## 1. Authentication, Scopes & Permissions

- **Authentication**: All HTTP requests must include a personal API Key in the `Authorization` header:
  ```http
  Authorization: Bearer ab_live_<64-character-hex>
  Content-Type: application/json
  ```
- **Base URLs**:
  - Production: `https://afterbuy.david888.com/api/v1` or `https://afterbuy.create360.ai/api/v1`
  - Local Dev: `http://localhost:5173/api/v1`
- **Timezone Standard**: All dates use `YYYY-MM-DD` formatted in the `Asia/Taipei` business timezone.
- **Language & Localization**:
  - The API and database seamlessly store items in Traditional Chinese, English, or any multilingual strings.
  - The Assistant should communicate with the user in their preferred language (defaults to Traditional Chinese `zh-TW` for Taiwanese households).
- **API Key Scopes**:
  - `read_write`: Full read and write permissions.
  - `read_only`: Read-only queries (`GET`). Any mutation requests (`POST`, `PATCH`, `DELETE`) will be rejected with `403 Forbidden`.
- **Shared Stock Space RBAC**:
  - `owner` / `admin`: Full administrative control over stock spaces and items.
  - `member`: Can create and edit items, but **cannot delete items created by other members**.
  - `viewer`: Strictly read-only; cannot create, edit, delete, replace, restock, or consume items.

---

## 2. Core Concepts & Field Distinctions (Critical)

To accurately manage household inventory, agents must strictly distinguish between the following three concepts:

### 2.1 Consumable Preset Library (`presets`)
- afterBUY includes a built-in catalog of common household consumable presets (e.g. Costco Kirkland 150-capsule Fish Oil, Brita filter cartridges, facial tissues, laundry pods, daily contact lenses).
- **Search Presets**: `GET /api/v1/presets?q=魚油` or `GET /api/v1/presets?q=filter`.
- **Fast Item Creation**: When creating an item (`POST /api/v1/items`), providing `presetId: "costco-fish-oil"` automatically populates recommended categories, cycle days / capsule counts, daily burn rates, and units.

### 2.2 Backup Spares (`backupStock`) vs In-Use Active Volume (`quantity`)
This is the most essential inventory distinction:
1. **Backup Spares (`backupStock`)**:
   - Number of **brand new, unopened spares** stored in cabinets, drawers, or pantry (e.g. 2 unopened bottles of fish oil, 3 new toothbrushes).
   - **Purchasing Restock (`POST /api/v1/items/:id/restock`)**: Call when buying new spares, increasing `backupStock` (e.g. `{ "delta": 2, "note": "Costco trip" }`).
   - **Replacing with New (`POST /api/v1/items/:id/replace`)**: Call when the old item is exhausted or expired. The system resets the countdown timer and **automatically decrements backup stock** (`backupStock -= 1`).
   - **Safety Stock Threshold (`minStockAlert`)**: When `backupStock < minStockAlert`, the item is flagged with `needsRestock: true`.
2. **In-Use Active Volume (`currentQuantity` / `initialQuantity`)**:
   - Volume remaining in the **currently open, active bottle or pack** (e.g. currently open fish oil bottle has 110 of 150 capsules remaining).
   - **Daily Consumption (`POST /api/v1/items/:id/consume`)**: Call when the user takes their daily dose (e.g. `{ "amount": 2 }`), reducing the active bottle count (clamped to 0).
   - **Volume Depleted (`quantity_depleted`)**: When `currentQuantity === 0`, the active container is empty and ready for replacement (`replace`) or restock.

### 2.3 Five Tracking Modes (`trackingMode`)
- `cycle`: Recurring interval replacement in days (requires `cycleDays`, e.g. toothbrush 90 days, water filter 30 days).
- `quantity`: Capacity volume & daily burn-rate countdown (requires `initialQuantity: 150`, `dailyUsage: 2`, `quantityUnit: "顆"`, e.g. fish oil, vitamins, tissues, daily contact lenses).
- `pao`: Period After Opening in months (requires `paoMonths`, e.g. sunscreen 12 months, eye drops 1 month, serum 6 months).
- `expiry`: Fixed expiration date (requires `expiryDate: "YYYY-MM-DD"`, e.g. pharmaceuticals, canned food, dry goods).
- `warranty`: Hardware warranty expiration date (requires `warrantyDate: "YYYY-MM-DD"`, e.g. air conditioner 7 years, vacuum 2 years).

---

## 3. Comprehensive Special Search Matrix

Endpoint: `GET /api/v1/items`

afterBUY provides granular search parameters tailored for natural language AI queries:

| Query Parameter | Allowed Values / Format | Description & Use Case |
| :--- | :--- | :--- |
| **`status`** | `all` | Return all active items (default) |
| | `overdue` | **Overdue**: Items whose replacement date has passed (`remainingDays < 0`) |
| | `due_today` | **Due Today**: Items due for replacement today (`remainingDays === 0`) |
| | `due_soon` | **Due Soon**: Items due within window (default 7 days, customizable via `dueWithinDays`) |
| | `low_stock` | **Low Backup Stock**: Items where `backupStock < minStockAlert` |
| | `out_of_stock` | **Out of Stock**: Unopened backup stock is completely exhausted (`backupStock === 0`) |
| | `in_stock` | **In Stock**: Has available unopened backup spares in cabinet/drawer (`backupStock > 0`) |
| | `needs_restock` | **Restock Shopping List**: Backup stock is low (`< minStockAlert`) OR in-use volume is empty (`=== 0`) |
| | `quantity_depleted` | **In-Use Volume Exhausted**: Currently open container is empty (`currentQuantity === 0`) |
| | `normal` | **Normal**: Healthy items (adequate backup stock and not due soon) |
| | `stored` | **Stored in Reserve**: Brand new items stored in reserve, timer not yet started (`isStored: true`) |
| | `snoozed` | **Snoozed**: Items with active reminder snoozes |
| **`stockStatus`** | `in_stock` \| `out_of_stock` \| `low_stock` | **Dedicated Backup Stock Filter**: Composable with any `status` (e.g. due soon with available spares: `?status=due_soon&stockStatus=in_stock`) |
| **`dueWithinDays`** | Positive integer (e.g. `3`, `7`, `14`, `30`) | **Custom Due Window**: Used with `status=due_soon` (e.g. "What's expiring in 3 days?" → `?status=due_soon&dueWithinDays=3`) |
| **`isStored`** | `true` \| `false` | Filter items stored in reserve vs currently in active use |
| **`trackingMode`** | `cycle` \| `quantity` \| `pao` \| `expiry` \| `warranty` | Filter by lifecycle tracking mode |
| **`category`** | `bathroom`, `kitchen`, `medicine`, `skincare`, `appliances`, `clothing`, `electronics`, `general` | Category filter |
| **`dueBefore`** | `YYYY-MM-DD` | Items with next due date on or before date |
| **`dueAfter`** | `YYYY-MM-DD` | Items with next due date on or after date |
| **`startedBefore`** | `YYYY-MM-DD` | Items started on or before date |
| **`startedAfter`** | `YYYY-MM-DD` | Items started on or after date |
| **`stockId`** | UUID string | Filter by specific stock space ID |
| **`location`** | String (fuzzy match) | Physical storage spot (e.g. "電視櫃", "浴室鏡櫃", "Pantry Shelf 2") |
| **`q`** | Keyword string | Full-text search across item name, specModel, and notes |
| **`sortBy`** | `dueDate` \| `backupStock` \| `quantity` \| `startDate` \| `name` \| `price` | Sort field (default `dueDate`) |
| **`sortOrder`** | `asc` \| `desc` | Sort direction (default `asc`) |

### Top-Level Summary Object
Every `GET /api/v1/items` response includes a 10-metric global `summary` enabling instant situational awareness:
```json
{
  "items": [...],
  "total": 15,
  "summary": {
    "total": 15,
    "overdue": 1,
    "dueToday": 0,
    "dueSoon": 3,
    "lowStock": 4,
    "outOfStock": 2,
    "inStock": 11,
    "quantityDepleted": 1,
    "needsRestock": 5,
    "stored": 2
  }
}
```

---

## 4. API Endpoints Reference

### 4.1 List Items (`list_items`)
- **HTTP**: `GET /api/v1/items`
- **Description**: Query user consumables with rich search parameters detailed in Section 3.

### 4.2 List Presets (`list_presets`)
- **HTTP**: `GET /api/v1/presets`
- **Query Params**: `q` (keyword e.g. "魚油", "filter"), `category`
- **Description**: Search common household consumable presets to obtain `preset.id`.

### 4.3 Create Item (`create_item`)
- **HTTP**: `POST /api/v1/items`
- **Body Fields**:
  - `presetId` (string, optional): Preset template ID (e.g. `"costco-fish-oil"`, `"brita-filter"`). Automatically fills category, cycle/quantity, dailyUsage, and units.
  - `name` (string, required if no `presetId`): Consumable name.
  - `category` (string, optional): Category code.
  - `trackingMode` (string, optional): `cycle` | `quantity` | `pao` | `expiry` | `warranty`.
  - `cycleDays` (number, optional): Interval days.
  - `initialQuantity` (number, optional): Full package capacity (e.g. 150).
  - `dailyUsage` (number, optional): Estimated daily consumption (e.g. 2).
  - `quantityUnit` (string, optional): Unit name (e.g. "顆", "錠", "包", "片").
  - `backupStock` (number, optional, default 0): Current unopened backup spare units.
  - `minStockAlert` (number, optional, default 1): Low stock warning threshold.
  - `price` (number, optional): Unit price.
  - `specModel` (string, optional): Specification/model (e.g. "150顆/瓶").
  - `stockId` (string, optional): Target stock space ID (defaults to user primary stock).

### 4.4 Restock Backup Spares (`restock_item`)
- **HTTP**: `POST /api/v1/items/:id/restock`
- **Body Fields**:
  - `delta` (number, optional, default 1): Number of new spare units to add (e.g. bought 2 bottles → `{ "delta": 2 }`).
  - `backupStock` (number, optional): Explicitly set absolute backup stock count.
  - `note` (string, optional): Restock note (e.g. "Costco purchase").
- **Description**: Increases unopened backup stock in drawer and records history log.

### 4.5 Record Replacement Today (`replace_item`)
- **HTTP**: `POST /api/v1/items/:id/replace`
- **Description**:
  - If `backupStock > 0`, system automatically decrements backup stock (`backupStock -= 1`), resets start date to today, and refills active bottle capacity to initial full volume.
  - If `backupStock === 0`, system resets the timer but returns a restock warning indicating zero spares remain.

### 4.6 Consume Active Quantity (`consume_item`)
- **HTTP**: `POST /api/v1/items/:id/consume`
- **Body Fields**:
  - `amount` (number, optional, aliases `count`, default `dailyUsage` or 1): Amount consumed.
- **Description**: Decrements currently open container quantity (clamped to 0).

### 4.7 Update Item Attributes (`update_item`)
- **HTTP**: `PATCH /api/v1/items/:id`
- **Description**: Partially update item fields.

### 4.8 Delete Item (`delete_item`)
- **HTTP**: `DELETE /api/v1/items/:id`
- **Description**: Soft deletes the item (removes from calendar and archives).

### 4.9 List Stock Spaces (`list_stocks`)
- **HTTP**: `GET /api/v1/stocks`
- **Description**: List accessible stock spaces (e.g. "Living Room", "Master Bath", "Office").

---

## 5. Practical Conversation Examples

### Example 1: Restock Shopping List Query
**User**: "I'm heading to Costco soon. What items are out of stock or running low on backup spares?"  
**Agent Action**:
1. Call `GET /api/v1/items?status=needs_restock`
2. Summarize the items needing purchase:
   - "Here is your Costco shopping restock list:
     - ⚠️ **Out of Stock**: Kirkland Facial Tissues (0 backup packs in cabinet)
     - ⚠️ **Low Spares**: Brita Filter Cartridge (1 remaining, below alert threshold of 2)
     - ⚠️ **Volume Depleted**: Kirkland Fish Oil (0 capsules in current bottle, 0 backups)
     Recommended priority: Replenish these 3 items!"

### Example 2: Short-Term Due Countdown Query
**User**: "Are there any household consumables due for replacement in the next 3 days?"  
**Agent Action**:
1. Call `GET /api/v1/items?status=due_soon&dueWithinDays=3`
2. Reply:
   - "You have 1 item due in the next 3 days:
     - Electric Toothbrush Head: Due in 2 days (2026-10-09). You have 2 new spare heads in drawer ready to swap!"

### Example 3: Checking In-Stock Backup Inventory
**User**: "What brand new unopened backup spares do we currently have in storage?"  
**Agent Action**:
1. Call `GET /api/v1/items?status=in_stock&sortBy=backupStock&sortOrder=desc`
2. Reply:
   - "Here is your current inventory of unopened backup spares:
     - Brita Filters: 4 unopened cartridges
     - Electric Toothbrush Heads: 2 new heads
     - Laundry Pods: 1 full unopened box"

### Example 4: Creating Item via Preset Template
**User**: "Add a Costco fish oil to my tracker. It's the 150-capsule bottle and I have 2 extra unopened bottles in the cabinet."  
**Agent Action**:
1. Call `GET /api/v1/presets?q=魚油` to get `presetId: "costco-fish-oil"`
2. Call `POST /api/v1/items` with:
   ```json
   {
     "presetId": "costco-fish-oil",
     "backupStock": 2
   }
   ```
3. Reply:
   - "Added 'Kirkland Signature Omega-3 Fish Oil (150 capsules)'! Configured for 2 capsules/day (~75 days). 2 unopened backup bottles recorded in storage."

### Example 5: Purchasing Spares
**User**: "I just bought 3 spare toothbrushes at the supermarket and put them in the bathroom cabinet."  
**Agent Action**:
1. Call `GET /api/v1/items?q=牙刷` to locate item ID
2. Call `POST /api/v1/items/:id/restock` with `{ "delta": 3, "note": "Supermarket restock" }`
3. Reply:
   - "Added 3 spare toothbrushes! You now have a total of 4 backup toothbrushes in storage."

### Example 6: Replacing Consumable (Auto-Decrement Spare)
**User**: "I just swapped in a fresh Brita water filter cartridge."  
**Agent Action**:
1. Call `GET /api/v1/items?q=濾芯` to locate item ID
2. Call `POST /api/v1/items/:id/replace`
3. Reply:
   - "Recorded Brita filter replacement today! The 30-day countdown has reset (next due date: 2026-11-06). 1 spare cartridge was automatically deducted from your cabinet (1 remaining)."
