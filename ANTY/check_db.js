const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://vuiuorjzonpyobpelyld.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1aXVvcmp6b25weW9icGVseWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDY4MDM2OTksImV4cCI6MjAyMjM3OTY5OX0.ARDJuGYox9CY3K8z287nEEFBmWVLTs6yCLkHHeMMTKw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUniqueness() {
    let output = 'Checking uniqueness of Modified column...\n';
    const { data, error } = await supabase
        .from('REPUESTOS_MANTENIMIENTO')
        .select('Modified')
        .limit(100);

    if (error) {
        output += `Error: ${JSON.stringify(error, null, 2)}\n`;
    } else if (data) {
        const values = data.map(d => d.Modified);
        const uniqueValues = new Set(values);
        output += `Total rows checked: ${data.length}\n`;
        output += `Unique Modified values: ${uniqueValues.size}\n`;

        if (values.length === uniqueValues.size) {
            output += 'Modified column is UNIQUE in this sample.\n';
        } else {
            output += 'Modified column is NOT unique.\n';
            // Show duplicates
            const counts = {};
            values.forEach(v => counts[v] = (counts[v] || 0) + 1);
            const duplicates = Object.keys(counts).filter(v => counts[v] > 1);
            output += `Duplicates: ${duplicates.join(', ')}\n`;
        }
    }

    fs.writeFileSync('uniqueness_check.txt', output);
    console.log('Result written to uniqueness_check.txt');
}

checkUniqueness();
