import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vuiuorjzonpyobpelyld.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1aXVvcmp6b25weW9icGVseWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDY4MDM2OTksImV4cCI6MjAyMjM3OTY5OX0.ARDJuGYox9CY3K8z287nEEFBmWVLTs6yCLkHHeMMTKw'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkOrder() {
  const { data, error } = await supabase
    .from('query_ordenes_fabricacion')
    .select('*')
    .eq('orden_fabricacion', '2258877')

  if (error) {
    console.error('Error fetching from query_ordenes_fabricacion:', error)
  } else {
    console.log('Result from query_ordenes_fabricacion:', data)
  }

  const { data: rawData, error: rawError } = await supabase
    .from('ordenes_fabricacion')
    .select('*')
    .eq('orden_fabricacion', '2258877')

  if (rawError) {
    console.error('Error fetching from ordenes_fabricacion:', rawError)
  } else {
    console.log('Result from ordenes_fabricacion:', rawData)
  }
}

checkOrder()
