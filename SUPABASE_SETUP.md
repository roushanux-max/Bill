# BillMint - Supabase Setup Guide

This guide will walk you through setting up your Supabase project, getting your API keys, and creating the necessary database tables so your new SaaS users' data remains completely private.

## Step 1: Create a Project
1. Go to [database.new](https://database.new) and sign in.
2. Click **New Project**.
3. Choose your Organization (or create one), enter a **Name** (e.g., `BillMint`), and generate a secure **Database Password**.
4. Choose a region close to your users (e.g., `Mumbai (ap-south-1)`).
5. Click **Create new project**.

## Step 2: Get Your API Keys
While your project is provisioning (takes a few minutes):
1. Navigate to **Project Settings** (the gear icon on the left bottom).
2. Go to **API** under the Configuration section.
3. You will need two values from this page to connect our app:
   - **Project URL** (e.g., `https://xxxx.supabase.co`)
   - **Project API Key (anon/public)**

You will need to place these in a `.env` file at the root of your project like this:
```env
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## Step 3: Run the Database Setup Script
We need to create the tables to store Stores, Customers, Products, and Invoices. We also need to set up "Row Level Security" (RLS) so users can ONLY see their own data.

1. Once the database is ready, go to the **SQL Editor** on the left menu (the `</>` icon).
2. Click **New Query**.
3. Paste the following SQL script exactly as it is:

```sql
-- 1. Create robust tables for your SaaS
CREATE TABLE stores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  industry_type TEXT,
  gstin TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  auth_distributors TEXT,
  branding_settings JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  gstin TEXT,
  address TEXT,
  state TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hsn_code TEXT,
  rate DECIMAL(10,2) NOT NULL,
  tax_percent DECIMAL(5,2) DEFAULT 0,
  unit TEXT DEFAULT 'pcs',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  items JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Turn ON Row Level Security (RLS)
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- 3. Create Security Policies (Users can only see and edit their OWN store's data)

-- Stores Policy: Users can only select/insert/update their own store record
CREATE POLICY "Users can manage their own store" 
ON stores FOR ALL USING (auth.uid() = user_id);

-- Customers Policy: Users can only see customers belong to their store
CREATE POLICY "Users can manage their own customers" 
ON customers FOR ALL USING (
  store_id IN (SELECT id FROM stores WHERE user_id = auth.uid())
);

-- Products Policy
CREATE POLICY "Users can manage their own products" 
ON products FOR ALL USING (
  store_id IN (SELECT id FROM stores WHERE user_id = auth.uid())
);

-- Invoices Policy
CREATE POLICY "Users can manage their own invoices" 
ON invoices FOR ALL USING (
  store_id IN (SELECT id FROM stores WHERE user_id = auth.uid())
);
```

4. Click **Run** on the bottom right. If it says "Success", your database is fully set up and secure!

## Step 4: Next Steps
Let me know once you have finished **Step 3**, and I will begin migrating the app's local storage code to use your new secure cloud database!
