'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        redirect('/hora-a-hora/error')
    }

    revalidatePath('/hora-a-hora', 'layout')
    redirect('/hora-a-hora')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signUp(data)

    if (error) {
        redirect('/hora-a-hora/error')
    }

    revalidatePath('/hora-a-hora', 'layout')
    redirect('/hora-a-hora')
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/hora-a-hora', 'layout')
    redirect('/hora-a-hora/login')
}
