export default function BridgeMinimalPage() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', backgroundColor: 'white', color: 'black' }}>
      <h1>🌉 Minimal Bridge Test</h1>
      <p>If you see this, the layout inheritance fix worked!</p>
      <p>Server can compile and serve pages outside the /bridge/ layout.</p>

      <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ddd' }}>
        <h2>Test Results:</h2>
        <ul>
          <li>✅ Page loads without hanging</li>
          <li>✅ No infinite redirects</li>
          <li>✅ Compilation successful</li>
        </ul>
      </div>

      <p>
        <strong>Next step:</strong> Access this working page, then try
        <code>http://localhost:3000/bridge/login</code> to see if the layout fix worked.
      </p>
    </div>
  );
}