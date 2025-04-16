// Using built-in fetch API

async function testDemoApi() {
  try {
    console.log('Creating demo data...');
    
    const response = await fetch('http://localhost:5000/api/demo/create-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        count: 5,
        challengeCount: 3
      }),
    });
    
    const data = await response.json();
    console.log('Demo data creation response:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('\nSuccess! You can now log in with:');
      console.log(`Username: ${data.data.loginCredentials.username}`);
      console.log(`Password: ${data.data.loginCredentials.password}`);
      console.log('\nSummary:');
      console.log(`- Created ${data.data.users} users`);
      console.log(`- Created ${data.data.connections} connections`);
      console.log(`- Created ${data.data.challenges} challenges`);
    } else {
      console.log('Error creating demo data:', data.error);
    }
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testDemoApi();