const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vuiuorjzonpyobpelyld.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1aXVvcmp6b25weW9icGVseWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDY4MDM2OTksImV4cCI6MjAyMjM3OTY5OX0.ARDJuGYox9CY3K8z287nEEFBmWVLTs6yCLkHHeMMTKw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUsers() {
    console.log("--- BUSCANDO ESTRUCTURA DE USUARIOS ---");
    const { data: users, error } = await supabase
        .from('usuarios')
        .select('*')
        .limit(1);
    
    if (error) {
        console.log("Error usuarios:", error.message);
    } else if (users && users.length > 0) {
        console.log("Campos usuarios:", Object.keys(users[0]).join(', '));
    } else {
        console.log("No hay usuarios.");
    }
}

checkUsers();
