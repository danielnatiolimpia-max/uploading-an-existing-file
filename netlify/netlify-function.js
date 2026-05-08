exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { fileData, mediaType, docType } = JSON.parse(event.body);

    const sysPrompt = `Ești expert în documente de transport rutier european. Extrage datele din document și returnează DOAR un obiect JSON strict, fără text suplimentar, fără backticks, fără explicații. Câmpuri posibile: expeditor, destinatar, origine, destinatie, marfa, greutate_kg, data_incarcare, data_livrare, nr_cmr, valoare_transport, moneda, client, tara, nr_vehicul, tip_vigneta, data_start, data_expirare, cost, nr_confirmare, operator, tip_asigurare, companie, nr_polita, furnizor, nr_factura, data, suma, descriere.`;

    const isPDF = mediaType === 'application/pdf';
    const contentBlock = isPDF
      ? { type: 'document', source: { type: 'base64', media_type: mediaType, data: fileData } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType, data: fileData } };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'pdfs-2024-09-25'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: sysPrompt,
        messages: [{
          role: 'user',
          content: [
            contentBlock,
            { type: 'text', text: `Tip document: ${docType}. Returnează DOAR JSON.` }
          ]
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.error?.message || 'API error' })
      };
    }

    const raw = data.content?.map(c => c.text || '').join('') || '{}';

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: raw
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
