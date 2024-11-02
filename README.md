## Streamora

A live-streaming platform  
</br>
server: express.js, node-media-server, postgres (drizzle)  
client: react, tanstack-query, tailwind, radixui/shadcn

#### How to stream

- Sign in to the website using google OAuth.
- Go to stream dashboard, fill the details and click start stream
- Go the the credentials page and copy the server URL and the stream key
- Open OBS or any other streaming software supporting rtmp, and paste the URL and the key
- Start streaming from the software (use H.264 encoding for best results)
