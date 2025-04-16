// Script to test our API endpoints
import fetch from 'node-fetch';

async function testApi() {
  const base = 'http://localhost:5000';
  let cookies = '';

  // Login first to get session cookie
  try {
    console.log('Logging in...');
    const loginRes = await fetch(`${base}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'testuser',
        password: 'password123',
      }),
    });

    if (!loginRes.ok) {
      console.error('Login failed:', await loginRes.text());
      return;
    }

    cookies = loginRes.headers.get('set-cookie');
    console.log('Successfully logged in!');
    
    // Test workout routines endpoints
    console.log('\nTesting workout routines API:');
    
    // Create a workout routine
    console.log('Creating workout routine...');
    const createRoutineRes = await fetch(`${base}/api/workout-routines`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      body: JSON.stringify({
        name: 'Full Body Workout',
        description: 'A comprehensive full body workout for intermediate fitness levels',
        exercises: [
          { name: 'Push Ups', sets: 3, reps: 15 },
          { name: 'Squats', sets: 4, reps: 12 },
          { name: 'Pull Ups', sets: 3, reps: 10 },
        ],
        targetMuscleGroups: ['chest', 'legs', 'back'],
        difficulty: 'intermediate',
        estimatedDuration: 45,
        isPublic: true
      }),
    });
    
    if (!createRoutineRes.ok) {
      console.error('Failed to create workout routine:', await createRoutineRes.text());
    } else {
      const routine = await createRoutineRes.json();
      console.log('Created workout routine:', routine);
      
      // Test get all routines
      console.log('\nFetching workout routines...');
      const getRoutinesRes = await fetch(`${base}/api/workout-routines`, {
        headers: { 'Cookie': cookies },
      });
      
      if (!getRoutinesRes.ok) {
        console.error('Failed to fetch workout routines:', await getRoutinesRes.text());
      } else {
        const routines = await getRoutinesRes.json();
        console.log(`Found ${routines.length} workout routines:`, routines);
      }
      
      // Test update routine
      console.log('\nUpdating workout routine...');
      const updateRoutineRes = await fetch(`${base}/api/workout-routines/${routine.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookies,
        },
        body: JSON.stringify({
          name: 'Updated Full Body Workout',
          description: 'An updated full body workout',
        }),
      });
      
      if (!updateRoutineRes.ok) {
        console.error('Failed to update workout routine:', await updateRoutineRes.text());
      } else {
        const updatedRoutine = await updateRoutineRes.json();
        console.log('Updated workout routine:', updatedRoutine);
      }
    }
    
    // Test scheduled meetups endpoints
    console.log('\nTesting scheduled meetups API:');
    
    // Create a meetup
    console.log('Creating scheduled meetup...');
    const createMeetupRes = await fetch(`${base}/api/meetups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      body: JSON.stringify({
        title: 'Morning Workout Session',
        description: 'Let\'s meet for a morning workout session at the gym',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        startTime: '08:30',
        gymName: 'Fitness Center',
        latitude: 37.7749,
        longitude: -122.4194,
        workoutType: 'strength',
        maxParticipants: 5
      }),
    });
    
    if (!createMeetupRes.ok) {
      console.error('Failed to create meetup:', await createMeetupRes.text());
    } else {
      const meetup = await createMeetupRes.json();
      console.log('Created meetup:', meetup);
      
      // Test get all meetups
      console.log('\nFetching meetups...');
      const getMeetupsRes = await fetch(`${base}/api/meetups`, {
        headers: { 'Cookie': cookies },
      });
      
      if (!getMeetupsRes.ok) {
        console.error('Failed to fetch meetups:', await getMeetupsRes.text());
      } else {
        const meetups = await getMeetupsRes.json();
        console.log(`Found ${meetups.length} meetups:`, meetups);
      }
      
      // Test get upcoming meetups
      console.log('\nFetching upcoming meetups...');
      const getUpcomingRes = await fetch(`${base}/api/meetups/upcoming`, {
        headers: { 'Cookie': cookies },
      });
      
      if (!getUpcomingRes.ok) {
        console.error('Failed to fetch upcoming meetups:', await getUpcomingRes.text());
      } else {
        const upcomingMeetups = await getUpcomingRes.json();
        console.log(`Found ${upcomingMeetups.length} upcoming meetups:`, upcomingMeetups);
      }
      
      // Test update meetup
      console.log('\nUpdating meetup...');
      const updateMeetupRes = await fetch(`${base}/api/meetups/${meetup.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookies,
        },
        body: JSON.stringify({
          title: 'Updated Morning Workout Session',
          description: 'Let\'s meet for an updated morning workout session'
        }),
      });
      
      if (!updateMeetupRes.ok) {
        console.error('Failed to update meetup:', await updateMeetupRes.text());
      } else {
        const updatedMeetup = await updateMeetupRes.json();
        console.log('Updated meetup:', updatedMeetup);
      }
    }
    
  } catch (error) {
    console.error('Error during API testing:', error);
  }
}

testApi();