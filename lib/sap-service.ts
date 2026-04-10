import https from 'https'

// Forzar la desactivación de validación SSL para SAP (Service Layer suele usar certificados auto-firmados)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const agent = new https.Agent({
    rejectUnauthorized: false
})

export interface SAPConfig {
    loginUrl: string
    companyDb: string
    user: string
    pass: string
}

async function getSAPConfig(): Promise<SAPConfig> {
    return {
        loginUrl: process.env.SAP_LOGIN_URL || '',
        companyDb: process.env.SAP_COMPANY_DB || '',
        user: process.env.SAP_USER || '',
        pass: process.env.SAP_PASSWORD || ''
    }
}

export async function loginSAP() {
    const config = await getSAPConfig()
    
    const response = await fetch(config.loginUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            CompanyDB: config.companyDb,
            UserName: config.user,
            Password: config.pass
        }),
        // @ts-ignore - native fetch in node supports duplex or we use agent via undici but standard node https works with some tweaks
        // However, for Next.js Route Handlers, using process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0' is often the easiest for self-signed
        // But let's try to be cleaner if possible.
        agent: agent 
    } as any)

    if (!response.ok) {
        throw new Error(`SAP Login failed: ${response.statusText}`)
    }

    const cookies = response.headers.get('set-cookie')
    const data = await response.json()
    
    return {
        sessionId: data.SessionId,
        cookies: cookies
    }
}

export async function updateMoldStatusInSAP(moldeSerial: string, nuevoEstado: string) {
    // 1. Auth
    const { sessionId, cookies } = await loginSAP()

    const baseUrl = process.env.SAP_LOGIN_URL?.replace('/Login', '') || ''

    // 2. Search for DocEntry
    const queryParams = new URLSearchParams({
        '$filter': `SerialNumber eq '${moldeSerial}' or MfrSerialNo eq '${moldeSerial}'`,
        '$select': 'DocEntry'
    })
    const searchUrl = `${baseUrl}/SerialNumberDetails?${queryParams.toString()}`
    
    const searchRes = await fetch(searchUrl, {
        method: 'GET',
        headers: {
            'Cookie': cookies || '',
            'B1SESSION': sessionId
        },
        // @ts-ignore
        agent: agent
    } as any)

    if (!searchRes.ok) {
        throw new Error(`SAP Search failed: ${searchRes.statusText}`)
    }

    const searchData = await searchRes.json()
    const docEntry = searchData.value?.[0]?.DocEntry

    if (!docEntry) {
        throw new Error(`No se encontró el molde ${moldeSerial} en SAP.`)
    }

    // 3. Update (PATCH)
    const patchUrl = `${baseUrl}/SerialNumberDetails(${docEntry})`
    const patchRes = await fetch(patchUrl, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookies || '',
            'B1SESSION': sessionId
        },
        body: JSON.stringify({
            U_EstadoMolde: nuevoEstado
        }),
        // @ts-ignore
        agent: agent
    } as any)

    if (!patchRes.ok) {
        const errorData = await patchRes.json().catch(() => ({}))
        throw new Error(`SAP Update failed: ${errorData.error?.message?.value || patchRes.statusText}`)
    }

    return { success: true, docEntry }
}

export async function getMoldDetailsFromSAP(moldeSerial: string) {
    try {
        // 1. Auth
        const { sessionId, cookies } = await loginSAP()

        const rawUrl = process.env.SAP_LOGIN_URL || ''
        const baseUrl = rawUrl.toLowerCase().endsWith('/login') 
            ? rawUrl.slice(0, -6) 
            : rawUrl.replace(/\/$/, '')

        // 2. Search for details (Codificación estándar OData)
        const filter = `SerialNumber eq '${moldeSerial.replace(/'/g, "''")}' or MfrSerialNo eq '${moldeSerial.replace(/'/g, "''")}'`
        const queryParams = new URLSearchParams({
            '$filter': filter,
            '$select': 'U_EstadoMolde,SerialNumber,MfrSerialNo'
        })
        const searchUrl = `${baseUrl}/SerialNumberDetails?${queryParams.toString()}`
        
        console.log(`[SAP Debug] Consultando: ${searchUrl}`)

        const searchRes = await fetch(searchUrl, {
            method: 'GET',
            headers: {
                'Cookie': cookies || '',
                'B1SESSION': sessionId
            },
            // @ts-ignore
            agent: agent
        } as any)

        if (!searchRes.ok) {
            const errorText = await searchRes.text()
            console.error(`Error en búsqueda SAP (${searchRes.status}):`, errorText)
            throw new Error(`SAP Search failed: ${searchRes.statusText}`)
        }

        const searchData = await searchRes.json()
        const moldDetails = searchData.value?.[0]

        if (!moldDetails) {
            console.warn(`Molde ${moldeSerial} no encontrado en SAP (SerialNumberDetails)`)
            return null
        }

        return {
            serial: moldDetails.SerialNumber,
            mfrSerial: moldDetails.MfrSerialNo,
            estadoSAP: moldDetails.U_EstadoMolde
        }
    } catch (error) {
        console.error('Error fatal en getMoldDetailsFromSAP:', error)
        throw error
    }
}
