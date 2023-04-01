import { type RequestEvent, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET = (({ url }) => {
  const min = Number(url.searchParams.get('min') ?? '0');
  const max = Number(url.searchParams.get('max') ?? '1');

  const d = max - min;

  if (isNaN(d) || d < 0) {
    throw error(400, 'min and max must be numbers, and min must be less than max');
  }

  const random = min + Math.random() * d;

  return new Response(String(random));
}) satisfies RequestHandler;


export const POST = (async ({ request }: RequestEvent) => {
  const body = await request.json();
  // const authHeader = request.headers.get('Authorization');
  console.log('request: ', request);
  console.log('body: ', body);


  return new Response(
    JSON.stringify(
      {
        body: {
          bye: 'world',
          request: request.body
        }
      }
    )
  );

}) satisfies RequestHandler;

