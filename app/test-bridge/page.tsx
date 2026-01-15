export default function TestBridgePage() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>🌉 Bridge Test Page</h1>
      <p>If you can see this, the server is working!</p>
      <p>This bypasses all bridge authentication and layouts.</p>

      <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>Quick Fix Instructions:</h2>
        <ol>
          <li>Clear your browser cache completely</li>
          <li>Try accessing: <code>http://localhost:3000/test-bridge</code></li>
          <li>If this works, the issue is with bridge-specific components</li>
        </ol>
      </div>
    </div>
  );
}