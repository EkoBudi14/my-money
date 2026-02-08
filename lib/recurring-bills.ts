import { supabase } from './supabase'
import { RecurringBill } from '@/types'

export async function getRecurringBills() {
    const { data, error } = await supabase
        .from('recurring_bills')
        .select('*')
        .order('due_date', { ascending: true })

    if (error) {
        console.error('Error fetching recurring bills:', error)
        return []
    }

    return data as RecurringBill[]
}

export async function addRecurringBill(bill: Omit<RecurringBill, 'id' | 'created_at'>) {
    const { data, error } = await supabase
        .from('recurring_bills')
        .insert([bill])
        .select()

    if (error) {
        console.error('Error adding recurring bill:', error)
        throw error
    }

    return data[0] as RecurringBill
}

export async function deleteRecurringBill(id: number) {
    const { error } = await supabase
        .from('recurring_bills')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting recurring bill:', error)
        throw error
    }
}

export async function updateRecurringBill(id: number, bill: Partial<Omit<RecurringBill, 'id' | 'created_at'>>) {
    const { data, error } = await supabase
        .from('recurring_bills')
        .update(bill)
        .eq('id', id)
        .select()

    if (error) {
        console.error('Error updating recurring bill:', error)
        throw error
    }

    return data[0] as RecurringBill
}
