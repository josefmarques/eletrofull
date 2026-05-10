"use client";

import React, { createContext, useContext, useReducer, ReactNode } from "react";
import { SaleItem, Customer, Payment } from "@/types/sale";

interface SaleState {
  items: SaleItem[];
  customer: Customer | null;
  discount: string;
  payments: Payment[];
}

type SaleAction =
  | { type: "ADD_ITEM"; payload: SaleItem }
  | { type: "REMOVE_ITEM"; payload: { productId: string } }
  | {
      type: "UPDATE_QUANTITY";
      payload: { productId: string; quantity: number };
    }
  | { type: "SET_CUSTOMER"; payload: Customer | null }
  | { type: "SET_DISCOUNT"; payload: string }
  | { type: "ADD_PAYMENT"; payload: Payment }
  | { type: "REMOVE_PAYMENT"; payload: { index: number } }
  | { type: "CLEAR_SALE" };

const initialState: SaleState = {
  items: [],
  customer: null,
  discount: "0.00",
  payments: [],
};

function saleReducer(state: SaleState, action: SaleAction): SaleState {
  switch (action.type) {
    case "ADD_ITEM": {
      const existingIndex = state.items.findIndex(
        (item) => item.productId === action.payload.productId,
      );

      if (existingIndex >= 0) {
        const updatedItems = [...state.items];
        const existingItem = updatedItems[existingIndex];
        const newQuantity = existingItem.quantity + action.payload.quantity;
        updatedItems[existingIndex] = {
          ...existingItem,
          quantity: newQuantity,
          subtotal: (newQuantity * parseFloat(existingItem.unitPrice)).toFixed(
            2,
          ),
        };
        return { ...state, items: updatedItems };
      }

      return { ...state, items: [...state.items, action.payload] };
    }

    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter(
          (item) => item.productId !== action.payload.productId,
        ),
      };

    case "UPDATE_QUANTITY": {
      if (action.payload.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter(
            (item) => item.productId !== action.payload.productId,
          ),
        };
      }

      const updatedItems = state.items.map((item) =>
        item.productId === action.payload.productId
          ? {
              ...item,
              quantity: action.payload.quantity,
              subtotal: (
                action.payload.quantity * parseFloat(item.unitPrice)
              ).toFixed(2),
            }
          : item,
      );
      return { ...state, items: updatedItems };
    }

    case "SET_CUSTOMER":
      return { ...state, customer: action.payload };

    case "SET_DISCOUNT":
      return { ...state, discount: action.payload };

    case "ADD_PAYMENT":
      return { ...state, payments: [...state.payments, action.payload] };

    case "REMOVE_PAYMENT":
      return {
        ...state,
        payments: state.payments.filter((_, i) => i !== action.payload.index),
      };

    case "CLEAR_SALE":
      return initialState;

    default:
      return state;
  }
}

interface SaleContextType {
  state: SaleState;
  addItem: (item: SaleItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setCustomer: (customer: Customer | null) => void;
  setDiscount: (discount: string) => void;
  addPayment: (method: string, amount: string) => void;
  removePayment: (index: number) => void;
  clearSale: () => void;
  subtotal: number;
  totalDiscount: number;
  total: number;
  totalPaid: number;
  change: number;
  hasCashPayment: boolean;
}

const SaleContext = createContext<SaleContextType | undefined>(undefined);

export function SaleProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(saleReducer, initialState);

  const addItem = (item: SaleItem) => {
    dispatch({ type: "ADD_ITEM", payload: item });
  };

  const removeItem = (productId: string) => {
    dispatch({ type: "REMOVE_ITEM", payload: { productId } });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    dispatch({ type: "UPDATE_QUANTITY", payload: { productId, quantity } });
  };

  const setCustomer = (customer: Customer | null) => {
    dispatch({ type: "SET_CUSTOMER", payload: customer });
  };

  const setDiscount = (discount: string) => {
    dispatch({ type: "SET_DISCOUNT", payload: discount });
  };

  const addPayment = (method: string, amount: string) => {
    dispatch({ type: "ADD_PAYMENT", payload: { method, amount } });
  };

  const removePayment = (index: number) => {
    dispatch({ type: "REMOVE_PAYMENT", payload: { index } });
  };

  const clearSale = () => {
    dispatch({ type: "CLEAR_SALE" });
  };

  const subtotal = state.items.reduce(
    (acc, item) => acc + parseFloat(item.subtotal),
    0,
  );

  const totalDiscount = parseFloat(state.discount) || 0;
  const total = Math.max(0, subtotal - totalDiscount);
  const totalPaid = state.payments.reduce(
    (acc, p) => acc + parseFloat(p.amount || "0"),
    0,
  );
  const hasCashPayment = state.payments.some((p) => p.method === "cash");
  const change = hasCashPayment && totalPaid > total ? totalPaid - total : 0;

  return (
    <SaleContext.Provider
      value={{
        state,
        addItem,
        removeItem,
        updateQuantity,
        setCustomer,
        setDiscount,
        addPayment,
        removePayment,
        clearSale,
        subtotal,
        totalDiscount,
        total,
        totalPaid,
        change,
        hasCashPayment,
      }}
    >
      {children}
    </SaleContext.Provider>
  );
}

export function useSale() {
  const context = useContext(SaleContext);
  if (context === undefined) {
    throw new Error("useSale must be used within a SaleProvider");
  }
  return context;
}
