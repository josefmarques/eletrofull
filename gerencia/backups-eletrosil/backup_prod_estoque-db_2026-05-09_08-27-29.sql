--
-- PostgreSQL database dump
--

\restrict apDiNzHYhMzNdwmS1yYE0QLz69mH9n6HeQfQMrXhysX8eUoJqFlbfrwoGXzFaHD

-- Dumped from database version 17.9 (Debian 17.9-1.pgdg13+1)
-- Dumped by pg_dump version 17.9 (Debian 17.9-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_branch_id_branches_id_fk;
ALTER TABLE IF EXISTS ONLY public.supplier_product_maps DROP CONSTRAINT IF EXISTS supplier_product_maps_local_product_id_fkey;
ALTER TABLE IF EXISTS ONLY public.stocks DROP CONSTRAINT IF EXISTS stocks_product_id_products_id_fk;
ALTER TABLE IF EXISTS ONLY public.stocks DROP CONSTRAINT IF EXISTS stocks_branch_id_branches_id_fk;
ALTER TABLE IF EXISTS ONLY public.sales DROP CONSTRAINT IF EXISTS sales_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.sales DROP CONSTRAINT IF EXISTS sales_customer_id_customers_id_fk;
ALTER TABLE IF EXISTS ONLY public.sales DROP CONSTRAINT IF EXISTS sales_branch_id_branches_id_fk;
ALTER TABLE IF EXISTS ONLY public.sale_items DROP CONSTRAINT IF EXISTS sale_items_sale_id_sales_id_fk;
ALTER TABLE IF EXISTS ONLY public.sale_items DROP CONSTRAINT IF EXISTS sale_items_product_id_products_id_fk;
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS products_category_id_categories_id_fk;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_sale_id_fkey;
ALTER TABLE IF EXISTS ONLY public.moves DROP CONSTRAINT IF EXISTS moves_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.moves DROP CONSTRAINT IF EXISTS moves_product_id_products_id_fk;
ALTER TABLE IF EXISTS ONLY public.moves DROP CONSTRAINT IF EXISTS moves_branch_id_branches_id_fk;
ALTER TABLE IF EXISTS ONLY public.cash_sessions DROP CONSTRAINT IF EXISTS cash_sessions_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.cash_sessions DROP CONSTRAINT IF EXISTS cash_sessions_branch_id_branches_id_fk;
ALTER TABLE IF EXISTS ONLY public.cash_movements DROP CONSTRAINT IF EXISTS cash_movements_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.cash_movements DROP CONSTRAINT IF EXISTS cash_movements_session_id_cash_sessions_id_fk;
DROP INDEX IF EXISTS public.ix_supplier_product_maps_supplier_cnpj;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_unique;
ALTER TABLE IF EXISTS ONLY public.supplier_product_maps DROP CONSTRAINT IF EXISTS uq_supplier_product_map;
ALTER TABLE IF EXISTS ONLY public.supplier_product_maps DROP CONSTRAINT IF EXISTS supplier_product_maps_pkey;
ALTER TABLE IF EXISTS ONLY public.stocks DROP CONSTRAINT IF EXISTS stocks_pkey;
ALTER TABLE IF EXISTS ONLY public.sales DROP CONSTRAINT IF EXISTS sales_pkey;
ALTER TABLE IF EXISTS ONLY public.sale_items DROP CONSTRAINT IF EXISTS sale_items_pkey;
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS products_pkey;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_pkey;
ALTER TABLE IF EXISTS ONLY public.moves DROP CONSTRAINT IF EXISTS moves_pkey;
ALTER TABLE IF EXISTS ONLY public.customers DROP CONSTRAINT IF EXISTS customers_pkey;
ALTER TABLE IF EXISTS ONLY public.customers DROP CONSTRAINT IF EXISTS customers_cpf_cnpj_unique;
ALTER TABLE IF EXISTS ONLY public.categories DROP CONSTRAINT IF EXISTS categories_pkey;
ALTER TABLE IF EXISTS ONLY public.cash_sessions DROP CONSTRAINT IF EXISTS cash_sessions_pkey;
ALTER TABLE IF EXISTS ONLY public.cash_movements DROP CONSTRAINT IF EXISTS cash_movements_pkey;
ALTER TABLE IF EXISTS ONLY public.branches DROP CONSTRAINT IF EXISTS branches_pkey;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.supplier_product_maps;
DROP TABLE IF EXISTS public.stocks;
DROP TABLE IF EXISTS public.sales;
DROP TABLE IF EXISTS public.sale_items;
DROP TABLE IF EXISTS public.products;
DROP TABLE IF EXISTS public.payments;
DROP TABLE IF EXISTS public.moves;
DROP TABLE IF EXISTS public.customers;
DROP TABLE IF EXISTS public.categories;
DROP TABLE IF EXISTS public.cash_sessions;
DROP TABLE IF EXISTS public.cash_movements;
DROP TABLE IF EXISTS public.branches;
DROP TYPE IF EXISTS public.unittype;
DROP TYPE IF EXISTS public.unit_type;
DROP TYPE IF EXISTS public.paymentmethod;
DROP TYPE IF EXISTS public.movetype;
DROP TYPE IF EXISTS public.move_type;
-- *not* dropping schema, since initdb creates it
--
-- Name: public; Type: SCHEMA; Schema: -; Owner: zemarques
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO zemarques;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: zemarques
--

COMMENT ON SCHEMA public IS '';


--
-- Name: move_type; Type: TYPE; Schema: public; Owner: zemarques
--

CREATE TYPE public.move_type AS ENUM (
    'in',
    'out'
);


ALTER TYPE public.move_type OWNER TO zemarques;

--
-- Name: movetype; Type: TYPE; Schema: public; Owner: zemarques
--

CREATE TYPE public.movetype AS ENUM (
    'in',
    'out'
);


ALTER TYPE public.movetype OWNER TO zemarques;

--
-- Name: paymentmethod; Type: TYPE; Schema: public; Owner: zemarques
--

CREATE TYPE public.paymentmethod AS ENUM (
    'CASH',
    'PIX',
    'CREDIT_CARD',
    'DEBIT_CARD'
);


ALTER TYPE public.paymentmethod OWNER TO zemarques;

--
-- Name: unit_type; Type: TYPE; Schema: public; Owner: zemarques
--

CREATE TYPE public.unit_type AS ENUM (
    'un',
    'cx',
    'rl',
    'm',
    'pc',
    'kg',
    'lt',
    'par',
    'cj'
);


ALTER TYPE public.unit_type OWNER TO zemarques;

--
-- Name: unittype; Type: TYPE; Schema: public; Owner: zemarques
--

CREATE TYPE public.unittype AS ENUM (
    'un',
    'cx',
    'rl',
    'm',
    'pc',
    'kg',
    'lt',
    'par',
    'cj',
    'g',
    'ml',
    'l'
);


ALTER TYPE public.unittype OWNER TO zemarques;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: branches; Type: TABLE; Schema: public; Owner: zemarques
--

CREATE TABLE public.branches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    address text,
    deleted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.branches OWNER TO zemarques;

--
-- Name: cash_movements; Type: TABLE; Schema: public; Owner: zemarques
--

CREATE TABLE public.cash_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    amount numeric(12,2) NOT NULL,
    description text,
    reference_id text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.cash_movements OWNER TO zemarques;

--
-- Name: cash_sessions; Type: TABLE; Schema: public; Owner: zemarques
--

CREATE TABLE public.cash_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid NOT NULL,
    user_id uuid NOT NULL,
    opening_balance numeric(12,2) DEFAULT 0.00 NOT NULL,
    closing_balance numeric(12,2),
    total_sales numeric(12,2) DEFAULT 0.00,
    total_withdrawals numeric(12,2) DEFAULT 0.00,
    total_deposits numeric(12,2) DEFAULT 0.00,
    difference numeric(12,2),
    status text DEFAULT 'open'::text NOT NULL,
    opened_at timestamp without time zone DEFAULT now(),
    closed_at timestamp without time zone,
    observations text
);


ALTER TABLE public.cash_sessions OWNER TO zemarques;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: zemarques
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    deleted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.categories OWNER TO zemarques;

--
-- Name: customers; Type: TABLE; Schema: public; Owner: zemarques
--

CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    cpf_cnpj text,
    email text,
    phone text,
    points integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone
);


ALTER TABLE public.customers OWNER TO zemarques;

--
-- Name: moves; Type: TABLE; Schema: public; Owner: zemarques
--

CREATE TABLE public.moves (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid NOT NULL,
    product_id uuid NOT NULL,
    user_id uuid NOT NULL,
    type public.move_type NOT NULL,
    quantity numeric NOT NULL,
    unit_price numeric NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.moves OWNER TO zemarques;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: zemarques
--

CREATE TABLE public.payments (
    id uuid NOT NULL,
    sale_id uuid NOT NULL,
    method public.paymentmethod NOT NULL,
    amount numeric(12,2) NOT NULL,
    created_at timestamp without time zone
);


ALTER TABLE public.payments OWNER TO zemarques;

--
-- Name: products; Type: TABLE; Schema: public; Owner: zemarques
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    category_id uuid NOT NULL,
    unit_price integer NOT NULL,
    unit_type public.unit_type DEFAULT 'un'::public.unit_type NOT NULL,
    deleted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.products OWNER TO zemarques;

--
-- Name: sale_items; Type: TABLE; Schema: public; Owner: zemarques
--

CREATE TABLE public.sale_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    subtotal numeric(12,2) NOT NULL
);


ALTER TABLE public.sale_items OWNER TO zemarques;

--
-- Name: sales; Type: TABLE; Schema: public; Owner: zemarques
--

CREATE TABLE public.sales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid NOT NULL,
    user_id uuid NOT NULL,
    customer_id uuid,
    gross_value numeric(12,2) NOT NULL,
    discount numeric(12,2) DEFAULT '0'::numeric,
    total_value numeric(12,2) NOT NULL,
    payment_method text DEFAULT 'cash'::text NOT NULL,
    payment_status text DEFAULT 'pending'::text NOT NULL,
    observations text,
    created_at timestamp without time zone DEFAULT now(),
    receipt_number integer NOT NULL
);


ALTER TABLE public.sales OWNER TO zemarques;

--
-- Name: sales_receipt_number_seq; Type: SEQUENCE; Schema: public; Owner: zemarques
--

ALTER TABLE public.sales ALTER COLUMN receipt_number ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.sales_receipt_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: stocks; Type: TABLE; Schema: public; Owner: zemarques
--

CREATE TABLE public.stocks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity numeric DEFAULT '0'::numeric NOT NULL,
    minimo_quantity numeric DEFAULT '0'::numeric NOT NULL,
    maximum_quantity numeric DEFAULT '0'::numeric NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.stocks OWNER TO zemarques;

--
-- Name: supplier_product_maps; Type: TABLE; Schema: public; Owner: zemarques
--

CREATE TABLE public.supplier_product_maps (
    id uuid NOT NULL,
    supplier_cnpj character varying(20) NOT NULL,
    supplier_product_code character varying(60) NOT NULL,
    local_product_id uuid NOT NULL,
    created_at timestamp without time zone NOT NULL
);


ALTER TABLE public.supplier_product_maps OWNER TO zemarques;

--
-- Name: users; Type: TABLE; Schema: public; Owner: zemarques
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid,
    name text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    avatar text,
    is_admin boolean DEFAULT false NOT NULL,
    token text,
    deleted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO zemarques;

--
-- Data for Name: branches; Type: TABLE DATA; Schema: public; Owner: zemarques
--

COPY public.branches (id, name, address, deleted_at, created_at, updated_at) FROM stdin;
db1624b3-b7e4-4262-a572-9451efeddf62	Loja Matriz Centro	Rua Principal, 100	\N	2026-05-03 10:55:43.214218	2026-05-03 10:55:43.214218
42be26ba-d8cb-44ca-a23c-301807fb7766	Filial Zona Norte	Av. Norte, 500	\N	2026-05-03 10:55:43.214218	2026-05-03 10:55:43.214218
0e177c37-d270-4f5c-8b6c-4e2c08bff9ae	Filial Zona Sul	Rodovia Sul, km 2	\N	2026-05-03 10:55:43.214218	2026-05-03 10:55:43.214218
\.


--
-- Data for Name: cash_movements; Type: TABLE DATA; Schema: public; Owner: zemarques
--

COPY public.cash_movements (id, session_id, user_id, type, amount, description, reference_id, created_at) FROM stdin;
\.


--
-- Data for Name: cash_sessions; Type: TABLE DATA; Schema: public; Owner: zemarques
--

COPY public.cash_sessions (id, branch_id, user_id, opening_balance, closing_balance, total_sales, total_withdrawals, total_deposits, difference, status, opened_at, closed_at, observations) FROM stdin;
c43e5b76-3276-4a40-a27c-02a929d0b7e6	0e177c37-d270-4f5c-8b6c-4e2c08bff9ae	2499208f-ede7-4cd3-b04c-63de60e48f42	1000.00	1800.00	300.00	0.00	0.00	-500.00	closed	2026-05-05 20:28:51.589793	2026-05-05 21:54:40.735	\N
1a3241e8-dfde-4066-a366-1d72f2f536be	db1624b3-b7e4-4262-a572-9451efeddf62	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	0.00	0.00	0.00	0.00	0.00	0.00	closed	2026-05-05 23:11:39.634191	2026-05-05 23:12:47.235	\N
5a3db55f-d17f-4068-adc9-7b9d602f4876	42be26ba-d8cb-44ca-a23c-301807fb7766	d90d13b3-11cf-4144-969e-55b0a3686434	0.00	500000.00	0.00	0.00	0.00	500000.00	closed	2026-05-06 11:26:19.179502	2026-05-08 12:20:10.479016	\N
31049d1b-20bf-436d-99ed-4e42232bb3f9	42be26ba-d8cb-44ca-a23c-301807fb7766	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	0.00	50.00	215.00	0.00	0.00	-165.00	closed	2026-05-05 20:25:28.929816	2026-05-08 22:33:11.434706	\N
e3d0c502-167e-4584-aec0-8cfefc4939c0	db1624b3-b7e4-4262-a572-9451efeddf62	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	0.00	0.00	0.00	0.00	0.00	0.00	closed	2026-05-06 11:02:21.609838	2026-05-08 22:33:45.360211	\N
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: zemarques
--

COPY public.categories (id, name, deleted_at, created_at, updated_at) FROM stdin;
48566283-1fae-45e0-8c18-47e5a9cdb327	Elétrica	\N	2026-05-03 10:55:43.228175	2026-05-03 10:55:43.228175
bc340d7b-d3e1-4341-9c95-75a19117f032	Hidráulica	\N	2026-05-03 10:55:43.228175	2026-05-03 10:55:43.228175
3bd1f2c7-c5df-413b-adcb-6e3ea14378d6	Iluminação	\N	2026-05-03 10:55:43.228175	2026-05-03 10:55:43.228175
0aaaa8a2-e7d5-48dd-80d8-84f4f50b24e7	Ferramentas	\N	2026-05-03 10:55:43.228175	2026-05-03 10:55:43.228175
9218c6b6-2ff2-4eeb-98f9-e9fb97952413	Ferragens e Diversos	\N	2026-05-03 10:55:43.228175	2026-05-03 10:55:43.228175
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: zemarques
--

COPY public.customers (id, name, cpf_cnpj, email, phone, points, created_at, updated_at, deleted_at) FROM stdin;
557c48c1-a2d3-4b3c-bef3-b5dbc9f0c9b3	Magda Alves	63295130663	murilo@gmail.com	+55 (31) 99685-2279	515	2026-05-05 20:26:42.046629	2026-05-06 11:27:11.868	\N
\.


--
-- Data for Name: moves; Type: TABLE DATA; Schema: public; Owner: zemarques
--

COPY public.moves (id, branch_id, product_id, user_id, type, quantity, unit_price, created_at) FROM stdin;
b410b805-818f-4f53-9ea0-d2069667a46e	db1624b3-b7e4-4262-a572-9451efeddf62	0fd27d4e-35bc-4b05-9081-4e9a160b59f2	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	60	12000	2026-04-03 10:55:43.244
040a0b35-4e89-47a1-8824-fdbdd7aa50ae	db1624b3-b7e4-4262-a572-9451efeddf62	0fd27d4e-35bc-4b05-9081-4e9a160b59f2	1777a17a-f778-405c-8e5d-eb7cf0e1ce1f	out	20	12000	2026-04-21 10:55:43.244
d4284e57-eb58-4405-8b25-9c487e67e604	42be26ba-d8cb-44ca-a23c-301807fb7766	0fd27d4e-35bc-4b05-9081-4e9a160b59f2	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	30	12000	2026-04-03 10:55:43.244
faad6b53-bdca-41a7-9feb-c32b6648d83e	42be26ba-d8cb-44ca-a23c-301807fb7766	0fd27d4e-35bc-4b05-9081-4e9a160b59f2	d90d13b3-11cf-4144-969e-55b0a3686434	out	25	12000	2026-04-16 10:55:43.244
c5d82b35-591e-48a9-8156-bbc24356decb	0e177c37-d270-4f5c-8b6c-4e2c08bff9ae	0fd27d4e-35bc-4b05-9081-4e9a160b59f2	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	40	12000	2026-04-03 10:55:43.245
7152c6f3-2d70-4652-aa4f-4c02c684e8b6	0e177c37-d270-4f5c-8b6c-4e2c08bff9ae	0fd27d4e-35bc-4b05-9081-4e9a160b59f2	2499208f-ede7-4cd3-b04c-63de60e48f42	out	10	12000	2026-04-13 10:55:43.245
52da4545-4522-4919-b42a-ac5d848006b5	db1624b3-b7e4-4262-a572-9451efeddf62	43b3dd69-9589-4d95-bd61-7908e43d741a	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	120	1590	2026-04-03 10:55:43.245
d906bc2c-72f8-4ed8-b14a-df2f0ba1c387	db1624b3-b7e4-4262-a572-9451efeddf62	43b3dd69-9589-4d95-bd61-7908e43d741a	1777a17a-f778-405c-8e5d-eb7cf0e1ce1f	out	80	1590	2026-04-29 10:55:43.245
558f67e7-8a8b-41d9-b5ec-828a579f4490	42be26ba-d8cb-44ca-a23c-301807fb7766	43b3dd69-9589-4d95-bd61-7908e43d741a	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	50	1590	2026-04-03 10:55:43.245
957a0044-7eb3-4ac3-90c0-ae2ed8972444	42be26ba-d8cb-44ca-a23c-301807fb7766	43b3dd69-9589-4d95-bd61-7908e43d741a	d90d13b3-11cf-4144-969e-55b0a3686434	out	10	1590	2026-04-14 10:55:43.245
c6a5a723-88a9-4c74-b70e-07507393a549	0e177c37-d270-4f5c-8b6c-4e2c08bff9ae	43b3dd69-9589-4d95-bd61-7908e43d741a	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	50	1590	2026-04-03 10:55:43.245
e4aae3c4-a710-46d4-969f-90e8d81ca361	0e177c37-d270-4f5c-8b6c-4e2c08bff9ae	43b3dd69-9589-4d95-bd61-7908e43d741a	2499208f-ede7-4cd3-b04c-63de60e48f42	out	5	1590	2026-04-22 10:55:43.245
59bede91-e390-4ac2-b400-20223efcb108	db1624b3-b7e4-4262-a572-9451efeddf62	8316b56c-6285-4608-883e-8cb7dbde170f	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	15	4500	2026-04-03 10:55:43.245
8202c4f0-cc2d-4f0d-a3dd-5ca5809321c3	db1624b3-b7e4-4262-a572-9451efeddf62	8316b56c-6285-4608-883e-8cb7dbde170f	1777a17a-f778-405c-8e5d-eb7cf0e1ce1f	out	5	4500	2026-04-15 10:55:43.245
47b1d9d9-f8f5-4340-b354-eaca4d9c4fde	42be26ba-d8cb-44ca-a23c-301807fb7766	8316b56c-6285-4608-883e-8cb7dbde170f	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	10	4500	2026-04-03 10:55:43.245
c514faa8-38ed-43ab-b8f8-6fe57ca76b06	42be26ba-d8cb-44ca-a23c-301807fb7766	8316b56c-6285-4608-883e-8cb7dbde170f	d90d13b3-11cf-4144-969e-55b0a3686434	out	2	4500	2026-04-17 10:55:43.245
44738380-868c-4cf0-8c8b-8270d39a494e	0e177c37-d270-4f5c-8b6c-4e2c08bff9ae	8316b56c-6285-4608-883e-8cb7dbde170f	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	5	4500	2026-04-03 10:55:43.245
c03604b7-8037-4bc4-aad2-64cbd6b3cdee	db1624b3-b7e4-4262-a572-9451efeddf62	613beea3-2ce4-43e0-be6e-c5553a060dc7	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	100	2890	2026-04-03 10:55:43.245
00361260-9c1a-4b25-aff7-0acdd22783da	db1624b3-b7e4-4262-a572-9451efeddf62	613beea3-2ce4-43e0-be6e-c5553a060dc7	1777a17a-f778-405c-8e5d-eb7cf0e1ce1f	out	85	2890	2026-04-14 10:55:43.245
6d7ad749-a081-4266-8b03-62d297a88bf8	42be26ba-d8cb-44ca-a23c-301807fb7766	613beea3-2ce4-43e0-be6e-c5553a060dc7	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	60	2890	2026-04-03 10:55:43.245
3c8c676a-45eb-4471-85ac-9d21e3e6ce2d	42be26ba-d8cb-44ca-a23c-301807fb7766	613beea3-2ce4-43e0-be6e-c5553a060dc7	d90d13b3-11cf-4144-969e-55b0a3686434	out	10	2890	2026-04-19 10:55:43.245
cf8d1f59-9331-47a9-bbdb-8079ea5a615e	0e177c37-d270-4f5c-8b6c-4e2c08bff9ae	613beea3-2ce4-43e0-be6e-c5553a060dc7	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	60	2890	2026-04-03 10:55:43.245
f392eb97-cee0-4a73-8c95-3969216dc26c	0e177c37-d270-4f5c-8b6c-4e2c08bff9ae	613beea3-2ce4-43e0-be6e-c5553a060dc7	2499208f-ede7-4cd3-b04c-63de60e48f42	out	20	2890	2026-04-21 10:55:43.245
a2b84680-2ec2-47b3-a1ec-397bb5ee5c46	db1624b3-b7e4-4262-a572-9451efeddf62	50c04e15-bbc2-40de-8a5a-d5ae52b90927	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	5	21500	2026-04-03 10:55:43.245
5c1998c9-b035-4692-b734-d370d2ef38de	42be26ba-d8cb-44ca-a23c-301807fb7766	50c04e15-bbc2-40de-8a5a-d5ae52b90927	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	3	21500	2026-04-03 10:55:43.245
7d990ba1-414e-4976-8cb3-927a74f91fc2	0e177c37-d270-4f5c-8b6c-4e2c08bff9ae	50c04e15-bbc2-40de-8a5a-d5ae52b90927	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	2	21500	2026-04-03 10:55:43.245
1c570e6f-be38-421f-accc-4b9e65bab823	db1624b3-b7e4-4262-a572-9451efeddf62	5a34bcff-4830-4d62-a96a-967751fac921	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	200	990	2026-04-03 10:55:43.245
dd999379-e1a7-419e-b807-6fae71bf33af	db1624b3-b7e4-4262-a572-9451efeddf62	5a34bcff-4830-4d62-a96a-967751fac921	1777a17a-f778-405c-8e5d-eb7cf0e1ce1f	out	150	990	2026-04-13 10:55:43.245
9f73adf7-b87f-45de-8914-bb4bd0232e4f	42be26ba-d8cb-44ca-a23c-301807fb7766	5a34bcff-4830-4d62-a96a-967751fac921	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	100	990	2026-04-03 10:55:43.245
22bc829b-7906-4cca-ba2e-84226bb62cc8	42be26ba-d8cb-44ca-a23c-301807fb7766	5a34bcff-4830-4d62-a96a-967751fac921	d90d13b3-11cf-4144-969e-55b0a3686434	out	40	990	2026-04-27 10:55:43.245
9e69ca48-27d0-404b-9a42-6c4ee8b3aab2	0e177c37-d270-4f5c-8b6c-4e2c08bff9ae	5a34bcff-4830-4d62-a96a-967751fac921	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	100	990	2026-04-03 10:55:43.245
66454ec4-1f24-4c16-bc4d-f526dec4d549	0e177c37-d270-4f5c-8b6c-4e2c08bff9ae	5a34bcff-4830-4d62-a96a-967751fac921	2499208f-ede7-4cd3-b04c-63de60e48f42	out	60	990	2026-04-22 10:55:43.245
9c9a0eda-2c5c-4007-9eb2-32b80efc1e5a	db1624b3-b7e4-4262-a572-9451efeddf62	5d3ad798-6b83-421c-82d9-8b589fea4804	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	10	8500	2026-04-03 10:55:43.245
07a0f72a-b9aa-4308-8fe4-743fe7572562	db1624b3-b7e4-4262-a572-9451efeddf62	5d3ad798-6b83-421c-82d9-8b589fea4804	1777a17a-f778-405c-8e5d-eb7cf0e1ce1f	out	5	8500	2026-04-18 10:55:43.245
27fac80c-2b0f-4582-aa1a-b6832963f457	42be26ba-d8cb-44ca-a23c-301807fb7766	5d3ad798-6b83-421c-82d9-8b589fea4804	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	5	8500	2026-04-03 10:55:43.245
2fd701ae-f3e4-488b-b204-a05c64ba59bb	0e177c37-d270-4f5c-8b6c-4e2c08bff9ae	5d3ad798-6b83-421c-82d9-8b589fea4804	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	5	8500	2026-04-03 10:55:43.245
0dbabcad-77a5-47ed-b040-85b54b5fc2c3	0e177c37-d270-4f5c-8b6c-4e2c08bff9ae	5d3ad798-6b83-421c-82d9-8b589fea4804	2499208f-ede7-4cd3-b04c-63de60e48f42	out	2	8500	2026-05-02 10:55:43.245
b159d2b5-cdb4-4e81-9c7f-12cffbb75c45	db1624b3-b7e4-4262-a572-9451efeddf62	ab95cd28-e73f-48db-9643-670f1e4d1a59	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	30	3500	2026-04-03 10:55:43.245
e475eb54-5ae5-4983-a9fc-a6066a653208	db1624b3-b7e4-4262-a572-9451efeddf62	ab95cd28-e73f-48db-9643-670f1e4d1a59	1777a17a-f778-405c-8e5d-eb7cf0e1ce1f	out	10	3500	2026-04-22 10:55:43.245
1af23379-fff1-4996-933f-4478aedb9823	42be26ba-d8cb-44ca-a23c-301807fb7766	ab95cd28-e73f-48db-9643-670f1e4d1a59	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	15	3500	2026-04-03 10:55:43.245
b9591eba-36dc-495c-b6ce-426660c5df8d	42be26ba-d8cb-44ca-a23c-301807fb7766	ab95cd28-e73f-48db-9643-670f1e4d1a59	d90d13b3-11cf-4144-969e-55b0a3686434	out	5	3500	2026-04-25 10:55:43.245
904dee3d-8c39-4314-9031-b639ec7530eb	0e177c37-d270-4f5c-8b6c-4e2c08bff9ae	ab95cd28-e73f-48db-9643-670f1e4d1a59	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	15	3500	2026-04-03 10:55:43.245
642a4713-d2e2-472d-be63-769295d4e793	0e177c37-d270-4f5c-8b6c-4e2c08bff9ae	ab95cd28-e73f-48db-9643-670f1e4d1a59	2499208f-ede7-4cd3-b04c-63de60e48f42	out	2	3500	2026-04-30 10:55:43.245
95ba6773-e1c7-4fd2-be5b-035321c20ccf	db1624b3-b7e4-4262-a572-9451efeddf62	7216d4a8-f5df-47e7-bf39-f21978665058	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	120	850	2026-04-03 10:55:43.245
7dde047e-bab0-4503-b9c1-3cb43995970c	db1624b3-b7e4-4262-a572-9451efeddf62	7216d4a8-f5df-47e7-bf39-f21978665058	1777a17a-f778-405c-8e5d-eb7cf0e1ce1f	out	50	850	2026-05-02 10:55:43.245
9a295163-251c-4c21-907d-1ecc0b22be74	42be26ba-d8cb-44ca-a23c-301807fb7766	7216d4a8-f5df-47e7-bf39-f21978665058	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	80	850	2026-04-03 10:55:43.245
fda25ad8-238b-4311-8230-3b0a57ad61c0	42be26ba-d8cb-44ca-a23c-301807fb7766	7216d4a8-f5df-47e7-bf39-f21978665058	d90d13b3-11cf-4144-969e-55b0a3686434	out	20	850	2026-04-28 10:55:43.245
e11b80cc-e80c-4ea6-b481-d63a7a9ed295	0e177c37-d270-4f5c-8b6c-4e2c08bff9ae	7216d4a8-f5df-47e7-bf39-f21978665058	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	80	850	2026-04-03 10:55:43.245
5436ee81-7c56-42de-a696-de1d7d736493	0e177c37-d270-4f5c-8b6c-4e2c08bff9ae	7216d4a8-f5df-47e7-bf39-f21978665058	2499208f-ede7-4cd3-b04c-63de60e48f42	out	10	850	2026-04-19 10:55:43.245
c1407e44-dbda-4c07-a78f-cb9100ff497b	42be26ba-d8cb-44ca-a23c-301807fb7766	50c04e15-bbc2-40de-8a5a-d5ae52b90927	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	out	1	21500	2026-05-08 15:46:31.858485
776c9700-9363-4568-a999-f74ee77dd270	0e177c37-d270-4f5c-8b6c-4e2c08bff9ae	50c04e15-bbc2-40de-8a5a-d5ae52b90927	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	out	1	21500	2026-05-08 15:47:09.409203
c9b89a03-41a8-43ff-b41a-4e6872023627	0e177c37-d270-4f5c-8b6c-4e2c08bff9ae	7216d4a8-f5df-47e7-bf39-f21978665058	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	out	1	850	2026-05-08 15:47:38.615342
3260d12b-dd93-4ad9-8849-e3a55b8cef96	42be26ba-d8cb-44ca-a23c-301807fb7766	78eb0227-80b6-42ce-a455-29823248f8c8	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	18	3550	2026-05-08 21:39:48.713697
0dcb743d-9585-4d7b-b737-4d95fb15fc85	42be26ba-d8cb-44ca-a23c-301807fb7766	c9725243-c53f-427e-9269-774b66917ea0	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	6	3479	2026-05-08 21:39:48.724284
d2cd3955-3b4f-4c2f-ba7c-315f163a7800	42be26ba-d8cb-44ca-a23c-301807fb7766	bcdc4caf-65f0-44b7-a062-b77282831764	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	12	2070	2026-05-08 21:39:48.731005
04250044-7088-4959-82d6-553dd19dc0bf	42be26ba-d8cb-44ca-a23c-301807fb7766	f72fca00-3735-4c11-8c08-dc768902a221	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	6	2150	2026-05-08 21:39:48.737277
112c718b-2598-4fc0-b5e0-5c93c9c8c682	42be26ba-d8cb-44ca-a23c-301807fb7766	96245030-27de-4418-8bae-fac54b68ca89	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	6	2119	2026-05-08 21:39:48.743346
30ac9967-804a-4466-a929-56f3dea93d9f	42be26ba-d8cb-44ca-a23c-301807fb7766	967c03cb-5a2b-41a9-b907-02224e0f1295	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	1	8750	2026-05-08 21:39:48.748956
79ca5154-f8c9-4ed5-a370-823df23248ca	42be26ba-d8cb-44ca-a23c-301807fb7766	ba929398-9575-4473-893f-81de5d1d0175	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	13	2189	2026-05-08 21:39:48.754463
23dba8f2-b1a9-4278-b9b4-ecda747a9a95	42be26ba-d8cb-44ca-a23c-301807fb7766	0ef964f4-6007-45db-9d12-0f6f16448aea	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	12	1061	2026-05-08 21:39:48.759703
21c9d5d3-be76-4c9b-a327-2ff64eb781ce	db1624b3-b7e4-4262-a572-9451efeddf62	f843f3b6-b3a0-4afb-99a0-e4482b443aaa	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	18	3550	2026-05-08 22:39:00.418363
baf6cf38-72dc-4b2b-8dab-e43a45fb9942	db1624b3-b7e4-4262-a572-9451efeddf62	c9725243-c53f-427e-9269-774b66917ea0	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	6	3479	2026-05-08 22:39:00.425578
1d733031-8336-4b6a-ab55-d512d11b8574	db1624b3-b7e4-4262-a572-9451efeddf62	bcdc4caf-65f0-44b7-a062-b77282831764	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	12	2070	2026-05-08 22:39:00.431137
62bd6cb2-5bc7-43b1-9b3a-dda27f93ba35	db1624b3-b7e4-4262-a572-9451efeddf62	1deb647c-cce2-4fed-99e0-5dc380b5c956	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	6	2150	2026-05-08 22:39:00.437598
727da4cc-77c3-453c-957e-db109ffe683c	db1624b3-b7e4-4262-a572-9451efeddf62	96245030-27de-4418-8bae-fac54b68ca89	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	6	2119	2026-05-08 22:39:00.442789
a1ab408b-4637-40d2-8677-b84866c1f3f1	db1624b3-b7e4-4262-a572-9451efeddf62	967c03cb-5a2b-41a9-b907-02224e0f1295	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	1	8750	2026-05-08 22:39:00.447868
1230e7db-31f7-4d70-9693-54cc22687566	db1624b3-b7e4-4262-a572-9451efeddf62	ba929398-9575-4473-893f-81de5d1d0175	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	13	2189	2026-05-08 22:39:00.452857
45ee3cc6-f4c8-4cc7-bf3a-baacce99ea9b	db1624b3-b7e4-4262-a572-9451efeddf62	0ef964f4-6007-45db-9d12-0f6f16448aea	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	in	12	1061	2026-05-08 22:39:00.457863
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: zemarques
--

COPY public.payments (id, sale_id, method, amount, created_at) FROM stdin;
41d85472-dbb9-43cc-8626-78f599676006	c1fd1085-a7e4-49c2-9e01-bf8319588e51	CREDIT_CARD	215.00	2026-05-08 15:46:31.859394
332f3a0a-3b9c-41d9-aec3-e52102df06b1	679e28ef-c5dd-4009-9bd8-d28b2adf26a2	DEBIT_CARD	215.00	2026-05-08 15:47:09.410214
5edfbf29-fa50-4f23-893b-beef65f08f6f	61dcfe93-e239-43de-b4e8-30643fb540ee	PIX	8.50	2026-05-08 15:47:38.615765
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: zemarques
--

COPY public.products (id, name, category_id, unit_price, unit_type, deleted_at, created_at, updated_at) FROM stdin;
0fd27d4e-35bc-4b05-9081-4e9a160b59f2	Rolo Fio Flexível 1.5mm 100m	48566283-1fae-45e0-8c18-47e5a9cdb327	12000	un	\N	2026-05-03 10:55:43.233314	2026-05-03 10:55:43.233314
8316b56c-6285-4608-883e-8cb7dbde170f	Quadro Distribuição 8/12 Disjuntores	48566283-1fae-45e0-8c18-47e5a9cdb327	4500	un	\N	2026-05-03 10:55:43.233314	2026-05-03 10:55:43.233314
613beea3-2ce4-43e0-be6e-c5553a060dc7	Tubo PVC Soldável 25mm 6m	bc340d7b-d3e1-4341-9c95-75a19117f032	2890	un	\N	2026-05-03 10:55:43.233314	2026-05-03 10:55:43.233314
50c04e15-bbc2-40de-8a5a-d5ae52b90927	Caixa D'água Polietileno 500L	bc340d7b-d3e1-4341-9c95-75a19117f032	21500	un	\N	2026-05-03 10:55:43.233314	2026-05-03 10:55:43.233314
5a34bcff-4830-4d62-a96a-967751fac921	Lâmpada LED Bulbo 9W	3bd1f2c7-c5df-413b-adcb-6e3ea14378d6	990	un	\N	2026-05-03 10:55:43.233314	2026-05-03 10:55:43.233314
5d3ad798-6b83-421c-82d9-8b589fea4804	Refletor LED 100W Bivolt	3bd1f2c7-c5df-413b-adcb-6e3ea14378d6	8500	un	\N	2026-05-03 10:55:43.233314	2026-05-03 10:55:43.233314
ab95cd28-e73f-48db-9643-670f1e4d1a59	Martelo Unha 25mm	0aaaa8a2-e7d5-48dd-80d8-84f4f50b24e7	3500	un	\N	2026-05-03 10:55:43.233314	2026-05-03 10:55:43.233314
7216d4a8-f5df-47e7-bf39-f21978665058	Caixa Bucha N° 8 (100 un)	9218c6b6-2ff2-4eeb-98f9-e9fb97952413	850	un	\N	2026-05-03 10:55:43.233314	2026-05-03 10:55:43.233314
c9725243-c53f-427e-9269-774b66917ea0	ASS SANIT HERC ALMOF PRIME CINZA CLARO	bc340d7b-d3e1-4341-9c95-75a19117f032	3479	un	\N	2026-05-08 21:38:23.220476	2026-05-08 21:38:23.220689
bcdc4caf-65f0-44b7-a062-b77282831764	ASS SANIT HERC ENVOLVENTE BRANCO	bc340d7b-d3e1-4341-9c95-75a19117f032	2070	un	\N	2026-05-08 21:38:35.54731	2026-05-08 21:38:35.547603
96245030-27de-4418-8bae-fac54b68ca89	ASS SANIT HERC ENVOLVENTE CZ ESCURO	bc340d7b-d3e1-4341-9c95-75a19117f032	2119	un	\N	2026-05-08 21:39:01.800745	2026-05-08 21:39:01.801024
967c03cb-5a2b-41a9-b907-02224e0f1295	ENGATE KRONA PLASTICO 60 CM	bc340d7b-d3e1-4341-9c95-75a19117f032	8750	un	\N	2026-05-08 21:39:12.368534	2026-05-08 21:39:12.368734
ba929398-9575-4473-893f-81de5d1d0175	TORN HERC PLAST JARDIM C/BICO ADAP 3/4 1128/101	bc340d7b-d3e1-4341-9c95-75a19117f032	2189	un	\N	2026-05-08 21:39:23.72359	2026-05-08 21:39:23.723756
0ef964f4-6007-45db-9d12-0f6f16448aea	TORNEIRA CLASSIC DE ESFERA 1/2 ACQUAPLUS	bc340d7b-d3e1-4341-9c95-75a19117f032	1061	un	\N	2026-05-08 21:39:37.017503	2026-05-08 21:39:37.01772
78eb0227-80b6-42ce-a455-29823248f8c8	ASS SANIT HERC ALMOF PRIME BRANCO	bc340d7b-d3e1-4341-9c95-75a19117f032	3550	un	2026-05-08 22:37:42.459529	2026-05-08 21:38:11.42725	2026-05-08 21:38:11.427492
f72fca00-3735-4c11-8c08-dc768902a221	ASS SANIT HERC ENVOLVENTE CZ CLARO	bc340d7b-d3e1-4341-9c95-75a19117f032	2150	un	2026-05-08 22:37:44.972032	2026-05-08 21:38:48.951261	2026-05-08 21:38:48.951456
43b3dd69-9589-4d95-bd61-7908e43d741a	Disjuntor DIN 20A	48566283-1fae-45e0-8c18-47e5a9cdb327	1590	un	2026-05-08 22:37:47.589779	2026-05-03 10:55:43.233314	2026-05-03 10:55:43.233314
f843f3b6-b3a0-4afb-99a0-e4482b443aaa	ASS SANIT HERC ALMOF PRIME BRANCO	bc340d7b-d3e1-4341-9c95-75a19117f032	3550	un	\N	2026-05-08 22:38:37.831194	2026-05-08 22:38:37.831623
1deb647c-cce2-4fed-99e0-5dc380b5c956	ASS SANIT HERC ENVOLVENTE CZ CLARO	bc340d7b-d3e1-4341-9c95-75a19117f032	2150	un	\N	2026-05-08 22:38:49.893924	2026-05-08 22:38:49.894185
\.


--
-- Data for Name: sale_items; Type: TABLE DATA; Schema: public; Owner: zemarques
--

COPY public.sale_items (id, sale_id, product_id, quantity, unit_price, subtotal) FROM stdin;
7eabb903-b790-408c-bc0f-d00e26ec6d2a	d3249a67-166d-46c3-b5a1-ba78d978c7ac	7216d4a8-f5df-47e7-bf39-f21978665058	10	8.50	85.00
13c2f2e3-acbf-488f-90e1-9bcd07ee82a5	f9d3569c-6d64-488a-b9dc-130cca95e393	50c04e15-bbc2-40de-8a5a-d5ae52b90927	1	215.00	215.00
5b6c7c76-3081-48ca-abbe-da072e10852d	b621fc1f-9776-4669-a9cd-d3f3ea9eba5c	50c04e15-bbc2-40de-8a5a-d5ae52b90927	1	215.00	215.00
66c290b9-3248-4fb2-b2cf-d924eececca8	c1fd1085-a7e4-49c2-9e01-bf8319588e51	50c04e15-bbc2-40de-8a5a-d5ae52b90927	1	215.00	215.00
d3f16385-cb54-445f-b31a-3912c9e8f6ca	679e28ef-c5dd-4009-9bd8-d28b2adf26a2	50c04e15-bbc2-40de-8a5a-d5ae52b90927	1	215.00	215.00
274e6066-6991-4050-b4b9-328c86232c27	61dcfe93-e239-43de-b4e8-30643fb540ee	7216d4a8-f5df-47e7-bf39-f21978665058	1	8.50	8.50
\.


--
-- Data for Name: sales; Type: TABLE DATA; Schema: public; Owner: zemarques
--

COPY public.sales (id, branch_id, user_id, customer_id, gross_value, discount, total_value, payment_method, payment_status, observations, created_at, receipt_number) FROM stdin;
d3249a67-166d-46c3-b5a1-ba78d978c7ac	0e177c37-d270-4f5c-8b6c-4e2c08bff9ae	2499208f-ede7-4cd3-b04c-63de60e48f42	557c48c1-a2d3-4b3c-bef3-b5dbc9f0c9b3	85.00	0.00	85.00	cash	paid	Troco: R$ 15.00	2026-05-05 20:29:35.692981	1
f9d3569c-6d64-488a-b9dc-130cca95e393	0e177c37-d270-4f5c-8b6c-4e2c08bff9ae	2499208f-ede7-4cd3-b04c-63de60e48f42	557c48c1-a2d3-4b3c-bef3-b5dbc9f0c9b3	215.00	0.00	215.00	cash	paid	Troco: R$ 85.00	2026-05-05 21:32:40.893291	2
b621fc1f-9776-4669-a9cd-d3f3ea9eba5c	42be26ba-d8cb-44ca-a23c-301807fb7766	d90d13b3-11cf-4144-969e-55b0a3686434	557c48c1-a2d3-4b3c-bef3-b5dbc9f0c9b3	215.00	0.00	215.00	cash	paid	Troco: R$ 35.00	2026-05-06 11:27:11.851178	3
c1fd1085-a7e4-49c2-9e01-bf8319588e51	42be26ba-d8cb-44ca-a23c-301807fb7766	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	557c48c1-a2d3-4b3c-bef3-b5dbc9f0c9b3	215.00	0.00	215.00	credit_card	completed	\N	2026-05-08 15:46:31.827448	4
679e28ef-c5dd-4009-9bd8-d28b2adf26a2	0e177c37-d270-4f5c-8b6c-4e2c08bff9ae	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	557c48c1-a2d3-4b3c-bef3-b5dbc9f0c9b3	215.00	0.00	215.00	debit_card	completed	\N	2026-05-08 15:47:09.398444	5
61dcfe93-e239-43de-b4e8-30643fb540ee	0e177c37-d270-4f5c-8b6c-4e2c08bff9ae	032ff5b2-cdd4-47c4-a25b-813fb0b4f371	557c48c1-a2d3-4b3c-bef3-b5dbc9f0c9b3	8.50	0.00	8.50	pix	completed	\N	2026-05-08 15:47:38.61108	6
\.


--
-- Data for Name: stocks; Type: TABLE DATA; Schema: public; Owner: zemarques
--

COPY public.stocks (id, branch_id, product_id, quantity, minimo_quantity, maximum_quantity, updated_at) FROM stdin;
a9dadccb-c407-4eaa-93f3-ce2d5e39fb5a	db1624b3-b7e4-4262-a572-9451efeddf62	0fd27d4e-35bc-4b05-9081-4e9a160b59f2	40	12	120	2026-05-03 10:55:43.251381
2a19c530-b8fa-4b9d-9efa-70ddcdd79601	42be26ba-d8cb-44ca-a23c-301807fb7766	0fd27d4e-35bc-4b05-9081-4e9a160b59f2	5	6	60	2026-05-03 10:55:43.251381
6c4ad758-c6d0-45f6-ad5f-aabc49ea1009	0e177c37-d270-4f5c-8b6c-4e2c08bff9ae	0fd27d4e-35bc-4b05-9081-4e9a160b59f2	30	8	80	2026-05-03 10:55:43.251381
4af25aff-16bf-4f91-b375-6db80a4a5de3	db1624b3-b7e4-4262-a572-9451efeddf62	43b3dd69-9589-4d95-bd61-7908e43d741a	40	24	240	2026-05-03 10:55:43.251381
abc817da-6d50-4d27-953f-a982dc821068	42be26ba-d8cb-44ca-a23c-301807fb7766	43b3dd69-9589-4d95-bd61-7908e43d741a	40	10	100	2026-05-03 10:55:43.251381
f0c32ca9-f9ea-45f8-b0ae-bfb55b372817	0e177c37-d270-4f5c-8b6c-4e2c08bff9ae	43b3dd69-9589-4d95-bd61-7908e43d741a	45	10	100	2026-05-03 10:55:43.251381
1b6c4642-5ff5-4b26-95b3-ffe093061345	db1624b3-b7e4-4262-a572-9451efeddf62	8316b56c-6285-4608-883e-8cb7dbde170f	10	3	30	2026-05-03 10:55:43.251381
1366f844-2c53-430a-8bf3-facb544aff7e	42be26ba-d8cb-44ca-a23c-301807fb7766	8316b56c-6285-4608-883e-8cb7dbde170f	8	2	20	2026-05-03 10:55:43.251381
0fdfd1d4-79fd-4313-a160-114655ef403e	0e177c37-d270-4f5c-8b6c-4e2c08bff9ae	8316b56c-6285-4608-883e-8cb7dbde170f	5	1	10	2026-05-03 10:55:43.251381
e05053ed-9421-495b-b34e-51a2253be876	db1624b3-b7e4-4262-a572-9451efeddf62	613beea3-2ce4-43e0-be6e-c5553a060dc7	15	20	200	2026-05-03 10:55:43.251381
d3d084bd-9810-4015-8d80-667cd2a46a3a	42be26ba-d8cb-44ca-a23c-301807fb7766	613beea3-2ce4-43e0-be6e-c5553a060dc7	50	12	120	2026-05-03 10:55:43.251381
fd02f836-fb36-4a17-a8d2-ddd015db599b	0e177c37-d270-4f5c-8b6c-4e2c08bff9ae	613beea3-2ce4-43e0-be6e-c5553a060dc7	40	12	120	2026-05-03 10:55:43.251381
648b3b6a-b091-40a0-aecd-06e1d1f617c9	db1624b3-b7e4-4262-a572-9451efeddf62	50c04e15-bbc2-40de-8a5a-d5ae52b90927	5	1	10	2026-05-03 10:55:43.251381
6e80082f-42ed-4990-9cbb-abb86c73519c	db1624b3-b7e4-4262-a572-9451efeddf62	5a34bcff-4830-4d62-a96a-967751fac921	50	40	400	2026-05-03 10:55:43.251381
f9d5ff5d-af88-4b24-972d-72244accfb7c	42be26ba-d8cb-44ca-a23c-301807fb7766	5a34bcff-4830-4d62-a96a-967751fac921	60	20	200	2026-05-03 10:55:43.251381
14c67c15-a07a-4fae-a43b-ab726a150c4c	0e177c37-d270-4f5c-8b6c-4e2c08bff9ae	5a34bcff-4830-4d62-a96a-967751fac921	40	20	200	2026-05-03 10:55:43.251381
f4274b93-1996-4816-9e0c-46c2ccb43881	db1624b3-b7e4-4262-a572-9451efeddf62	5d3ad798-6b83-421c-82d9-8b589fea4804	5	2	20	2026-05-03 10:55:43.251381
09cc1a59-d308-4caf-93c5-73f4dd8b6c91	42be26ba-d8cb-44ca-a23c-301807fb7766	5d3ad798-6b83-421c-82d9-8b589fea4804	5	1	10	2026-05-03 10:55:43.251381
c06d7635-eac4-4818-b1b8-88b76898329d	0e177c37-d270-4f5c-8b6c-4e2c08bff9ae	5d3ad798-6b83-421c-82d9-8b589fea4804	3	1	10	2026-05-03 10:55:43.251381
4eeedfef-8916-4f32-af20-b38998989c7d	db1624b3-b7e4-4262-a572-9451efeddf62	ab95cd28-e73f-48db-9643-670f1e4d1a59	20	6	60	2026-05-03 10:55:43.251381
68320e01-5fe7-4dd7-979a-cb56f57b4696	42be26ba-d8cb-44ca-a23c-301807fb7766	ab95cd28-e73f-48db-9643-670f1e4d1a59	10	3	30	2026-05-03 10:55:43.251381
cc6355e7-1cf9-4dd9-934d-ca1087afb4e0	0e177c37-d270-4f5c-8b6c-4e2c08bff9ae	ab95cd28-e73f-48db-9643-670f1e4d1a59	13	3	30	2026-05-03 10:55:43.251381
eb7ce137-96f0-4ad2-9686-a790dfd277ff	db1624b3-b7e4-4262-a572-9451efeddf62	7216d4a8-f5df-47e7-bf39-f21978665058	70	24	240	2026-05-03 10:55:43.251381
f933aec2-5462-4f05-a40b-0818f1ff0c9a	42be26ba-d8cb-44ca-a23c-301807fb7766	7216d4a8-f5df-47e7-bf39-f21978665058	60	16	160	2026-05-03 10:55:43.251381
994e134c-839e-4495-ada5-034a0577200e	42be26ba-d8cb-44ca-a23c-301807fb7766	50c04e15-bbc2-40de-8a5a-d5ae52b90927	1	0	6	2026-05-08 15:46:31.857651
72dfe08e-50f5-4d27-ab81-28a8e645f606	0e177c37-d270-4f5c-8b6c-4e2c08bff9ae	50c04e15-bbc2-40de-8a5a-d5ae52b90927	0	0	4	2026-05-08 15:47:09.408022
3add0904-3058-4eaa-b720-c729387747d2	0e177c37-d270-4f5c-8b6c-4e2c08bff9ae	7216d4a8-f5df-47e7-bf39-f21978665058	59	16	160	2026-05-08 15:47:38.614824
9e66d163-1e08-48a8-a3f3-f81779557b7b	db1624b3-b7e4-4262-a572-9451efeddf62	78eb0227-80b6-42ce-a455-29823248f8c8	0	0	0	2026-05-08 21:38:11.436478
592650e2-9c81-489d-b1eb-617961e4f398	db1624b3-b7e4-4262-a572-9451efeddf62	f72fca00-3735-4c11-8c08-dc768902a221	0	0	0	2026-05-08 21:38:48.954015
fb55b8cc-b146-4f9a-815b-a21f75b91e17	42be26ba-d8cb-44ca-a23c-301807fb7766	78eb0227-80b6-42ce-a455-29823248f8c8	18	0	0	2026-05-08 21:39:48.719893
db3aedc5-d0b1-4e47-bab2-f8f9b1afdb92	42be26ba-d8cb-44ca-a23c-301807fb7766	c9725243-c53f-427e-9269-774b66917ea0	6	0	0	2026-05-08 21:39:48.727605
ac5d9944-0d5b-4981-a29c-2354c4eaad74	42be26ba-d8cb-44ca-a23c-301807fb7766	bcdc4caf-65f0-44b7-a062-b77282831764	12	0	0	2026-05-08 21:39:48.734156
e8258c0b-be51-45a5-9ce2-ce67f05f580a	42be26ba-d8cb-44ca-a23c-301807fb7766	f72fca00-3735-4c11-8c08-dc768902a221	6	0	0	2026-05-08 21:39:48.740321
9471eb1e-a7f3-42a5-a9d1-f71d8f876806	42be26ba-d8cb-44ca-a23c-301807fb7766	96245030-27de-4418-8bae-fac54b68ca89	6	0	0	2026-05-08 21:39:48.746179
fd137f56-9519-4247-8b29-7f8f02d45e9e	42be26ba-d8cb-44ca-a23c-301807fb7766	967c03cb-5a2b-41a9-b907-02224e0f1295	1	0	0	2026-05-08 21:39:48.751902
d8003167-49a0-44e1-9c8e-da05ebd97e5b	42be26ba-d8cb-44ca-a23c-301807fb7766	ba929398-9575-4473-893f-81de5d1d0175	13	0	0	2026-05-08 21:39:48.757087
bad80be5-201c-4cfa-a6cf-4f0b89a4cc47	42be26ba-d8cb-44ca-a23c-301807fb7766	0ef964f4-6007-45db-9d12-0f6f16448aea	12	0	0	2026-05-08 21:39:48.762328
bb2022aa-971f-4e21-8a32-41a704e15762	db1624b3-b7e4-4262-a572-9451efeddf62	f843f3b6-b3a0-4afb-99a0-e4482b443aaa	18	0	0	2026-05-08 22:39:00.421418
b8ebf1e7-8b0b-4ec6-b7c2-175a5137b636	db1624b3-b7e4-4262-a572-9451efeddf62	c9725243-c53f-427e-9269-774b66917ea0	6	0	0	2026-05-08 22:39:00.428136
8c4023f5-8125-47a8-93f3-419a12618c7c	db1624b3-b7e4-4262-a572-9451efeddf62	bcdc4caf-65f0-44b7-a062-b77282831764	12	0	0	2026-05-08 22:39:00.434719
a4130cc8-f624-477a-ac7d-f82b027ddc39	db1624b3-b7e4-4262-a572-9451efeddf62	1deb647c-cce2-4fed-99e0-5dc380b5c956	6	0	0	2026-05-08 22:39:00.440107
1d3e3d0d-9013-4031-94e8-12ac931a630c	db1624b3-b7e4-4262-a572-9451efeddf62	96245030-27de-4418-8bae-fac54b68ca89	6	0	0	2026-05-08 22:39:00.445096
87e54add-f84c-40d7-8123-467e17da6b75	db1624b3-b7e4-4262-a572-9451efeddf62	967c03cb-5a2b-41a9-b907-02224e0f1295	1	0	0	2026-05-08 22:39:00.450243
e7d674fc-b7d5-45fa-b117-77b02ec6a6c8	db1624b3-b7e4-4262-a572-9451efeddf62	ba929398-9575-4473-893f-81de5d1d0175	13	0	0	2026-05-08 22:39:00.455291
920c5ba8-baaf-4340-be87-62364883385d	db1624b3-b7e4-4262-a572-9451efeddf62	0ef964f4-6007-45db-9d12-0f6f16448aea	12	0	0	2026-05-08 22:39:00.460134
\.


--
-- Data for Name: supplier_product_maps; Type: TABLE DATA; Schema: public; Owner: zemarques
--

COPY public.supplier_product_maps (id, supplier_cnpj, supplier_product_code, local_product_id, created_at) FROM stdin;
155456e5-64fc-41c8-b60a-22ed16c3d31d	16163057001385	60490	f843f3b6-b3a0-4afb-99a0-e4482b443aaa	2026-05-08 22:39:00.320713
33c18e5d-3c2b-4ad0-b7c3-eb7a4fda8b11	16163057001385	60491	c9725243-c53f-427e-9269-774b66917ea0	2026-05-08 22:39:00.320713
8c704b84-d50d-4616-afe8-8b06fd668f95	16163057001385	63903	bcdc4caf-65f0-44b7-a062-b77282831764	2026-05-08 22:39:00.320713
ef20af4e-6d91-4b56-917a-16815473dd6e	16163057001385	63904	1deb647c-cce2-4fed-99e0-5dc380b5c956	2026-05-08 22:39:00.320713
2f221150-f355-4289-9237-1caf1320553b	16163057001385	63905	96245030-27de-4418-8bae-fac54b68ca89	2026-05-08 22:39:00.320713
b1b96cc8-2bc1-4ca2-8ed3-ef8e4daf199d	16163057001385	31306	967c03cb-5a2b-41a9-b907-02224e0f1295	2026-05-08 22:39:00.320713
ccd147c4-2a6a-48b5-8849-a470b185e047	16163057001385	74429	ba929398-9575-4473-893f-81de5d1d0175	2026-05-08 22:39:00.320713
cd078285-7820-4605-b22f-e08f2be68307	16163057001385	89311	0ef964f4-6007-45db-9d12-0f6f16448aea	2026-05-08 22:39:00.320713
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: zemarques
--

COPY public.users (id, branch_id, name, email, password, avatar, is_admin, token, deleted_at, created_at, updated_at) FROM stdin;
d90d13b3-11cf-4144-969e-55b0a3686434	42be26ba-d8cb-44ca-a23c-301807fb7766	Operador Norte	norte@eletrosil.top	$2b$10$0enl/A.OiWOWxBuhbQQbUOgnuO.dI9KU7VMIRVQO57/wb.fgQs7FG	\N	f	7f04d273d740eed895ee7aa5391736e2fb78fc46b7413448b156e0ea85c79292	\N	2026-05-03 10:55:43.222426	2026-05-06 11:26:10.034
1777a17a-f778-405c-8e5d-eb7cf0e1ce1f	db1624b3-b7e4-4262-a572-9451efeddf62	José Marques (Caixa)	josemarques@eletrosil.top	$2b$10$0enl/A.OiWOWxBuhbQQbUOgnuO.dI9KU7VMIRVQO57/wb.fgQs7FG	\N	f	\N	\N	2026-05-03 10:55:43.222426	2026-05-03 10:55:43.222426
2499208f-ede7-4cd3-b04c-63de60e48f42	0e177c37-d270-4f5c-8b6c-4e2c08bff9ae	Operador Sul	sul@eletrosil.top	$2b$10$0enl/A.OiWOWxBuhbQQbUOgnuO.dI9KU7VMIRVQO57/wb.fgQs7FG	\N	f	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyNDk5MjA4Zi1lZGU3LTRjZDMtYjA0Yy02M2RlNjBlNDhmNDIiLCJlbWFpbCI6InN1bEBlbGV0cm9zaWwudG9wIiwibmFtZSI6Ik9wZXJhZG9yIFN1bCIsImlzX2FkbWluIjpmYWxzZSwiZXhwIjoxNzc4ODcyNDYxfQ.e-Mm_lo7-KHOCdJNWKt-0uShlK-ktYhD4Hhmbt2EGko	\N	2026-05-03 10:55:43.222426	2026-05-06 23:34:43.058
032ff5b2-cdd4-47c4-a25b-813fb0b4f371	\N	Admin Global	admin@eletrosil.top	$2b$10$0enl/A.OiWOWxBuhbQQbUOgnuO.dI9KU7VMIRVQO57/wb.fgQs7FG	\N	t	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMzJmZjViMi1jZGQ0LTQ3YzQtYTI1Yi04MTNmYjBiNGYzNzEiLCJlbWFpbCI6ImFkbWluQGVsZXRyb3NpbC50b3AiLCJuYW1lIjoiQWRtaW4gR2xvYmFsIiwiaXNfYWRtaW4iOnRydWUsImV4cCI6MTc3ODg4NTg3MH0.dAlJQph0NT6BVDKxv_IBjxe6Lt0PlyngqFw_x1TU_dc	\N	2026-05-03 10:55:43.222426	2026-05-06 20:34:59.935
\.


--
-- Name: sales_receipt_number_seq; Type: SEQUENCE SET; Schema: public; Owner: zemarques
--

SELECT pg_catalog.setval('public.sales_receipt_number_seq', 6, true);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: zemarques
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


--
-- Name: cash_movements cash_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: zemarques
--

ALTER TABLE ONLY public.cash_movements
    ADD CONSTRAINT cash_movements_pkey PRIMARY KEY (id);


--
-- Name: cash_sessions cash_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: zemarques
--

ALTER TABLE ONLY public.cash_sessions
    ADD CONSTRAINT cash_sessions_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: zemarques
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: customers customers_cpf_cnpj_unique; Type: CONSTRAINT; Schema: public; Owner: zemarques
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_cpf_cnpj_unique UNIQUE (cpf_cnpj);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: zemarques
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: moves moves_pkey; Type: CONSTRAINT; Schema: public; Owner: zemarques
--

ALTER TABLE ONLY public.moves
    ADD CONSTRAINT moves_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: zemarques
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: zemarques
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: sale_items sale_items_pkey; Type: CONSTRAINT; Schema: public; Owner: zemarques
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_pkey PRIMARY KEY (id);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: zemarques
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


--
-- Name: stocks stocks_pkey; Type: CONSTRAINT; Schema: public; Owner: zemarques
--

ALTER TABLE ONLY public.stocks
    ADD CONSTRAINT stocks_pkey PRIMARY KEY (id);


--
-- Name: supplier_product_maps supplier_product_maps_pkey; Type: CONSTRAINT; Schema: public; Owner: zemarques
--

ALTER TABLE ONLY public.supplier_product_maps
    ADD CONSTRAINT supplier_product_maps_pkey PRIMARY KEY (id);


--
-- Name: supplier_product_maps uq_supplier_product_map; Type: CONSTRAINT; Schema: public; Owner: zemarques
--

ALTER TABLE ONLY public.supplier_product_maps
    ADD CONSTRAINT uq_supplier_product_map UNIQUE (supplier_cnpj, supplier_product_code);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: zemarques
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: zemarques
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_supplier_product_maps_supplier_cnpj; Type: INDEX; Schema: public; Owner: zemarques
--

CREATE INDEX ix_supplier_product_maps_supplier_cnpj ON public.supplier_product_maps USING btree (supplier_cnpj);


--
-- Name: cash_movements cash_movements_session_id_cash_sessions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: zemarques
--

ALTER TABLE ONLY public.cash_movements
    ADD CONSTRAINT cash_movements_session_id_cash_sessions_id_fk FOREIGN KEY (session_id) REFERENCES public.cash_sessions(id);


--
-- Name: cash_movements cash_movements_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: zemarques
--

ALTER TABLE ONLY public.cash_movements
    ADD CONSTRAINT cash_movements_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: cash_sessions cash_sessions_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: zemarques
--

ALTER TABLE ONLY public.cash_sessions
    ADD CONSTRAINT cash_sessions_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: cash_sessions cash_sessions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: zemarques
--

ALTER TABLE ONLY public.cash_sessions
    ADD CONSTRAINT cash_sessions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: moves moves_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: zemarques
--

ALTER TABLE ONLY public.moves
    ADD CONSTRAINT moves_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: moves moves_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: zemarques
--

ALTER TABLE ONLY public.moves
    ADD CONSTRAINT moves_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: moves moves_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: zemarques
--

ALTER TABLE ONLY public.moves
    ADD CONSTRAINT moves_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: payments payments_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zemarques
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id);


--
-- Name: products products_category_id_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: zemarques
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: sale_items sale_items_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: zemarques
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: sale_items sale_items_sale_id_sales_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: zemarques
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_sale_id_sales_id_fk FOREIGN KEY (sale_id) REFERENCES public.sales(id);


--
-- Name: sales sales_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: zemarques
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: sales sales_customer_id_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: zemarques
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_customer_id_customers_id_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: sales sales_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: zemarques
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: stocks stocks_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: zemarques
--

ALTER TABLE ONLY public.stocks
    ADD CONSTRAINT stocks_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: stocks stocks_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: zemarques
--

ALTER TABLE ONLY public.stocks
    ADD CONSTRAINT stocks_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: supplier_product_maps supplier_product_maps_local_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zemarques
--

ALTER TABLE ONLY public.supplier_product_maps
    ADD CONSTRAINT supplier_product_maps_local_product_id_fkey FOREIGN KEY (local_product_id) REFERENCES public.products(id);


--
-- Name: users users_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: zemarques
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: zemarques
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict apDiNzHYhMzNdwmS1yYE0QLz69mH9n6HeQfQMrXhysX8eUoJqFlbfrwoGXzFaHD

