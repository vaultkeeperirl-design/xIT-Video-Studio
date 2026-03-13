import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { spawn } from 'child_process';

describe('Render Endpoint Maximum Call Stack', () => {
  let serverProcess: any;

  beforeAll(async () => {
    return new Promise((resolve) => {
      serverProcess = spawn('node', ['scripts/local-ffmpeg-server.js']);
      serverProcess.stdout.on('data', (data: Buffer) => {
        if (data.toString().includes('running at')) {
          resolve(undefined);
        }
      });
    });
  });

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  it('should not throw Maximum call stack size exceeded for large projects', async () => {
    const createSession = () => new Promise<string>((resolve) => {
      const req = http.request('http://localhost:3333/session/create', { method: 'POST' }, (res) => {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => {
          resolve(JSON.parse(data).sessionId);
        });
      });
      req.end();
    });

    const sessionId = await createSession();

    const updateProject = (id: string, clips: any[]) => new Promise<void>((resolve) => {
      const req = http.request(`http://localhost:3333/session/${id}/project`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      }, (res) => {
        res.on('data', () => {});
        res.on('end', resolve);
      });
      req.write(JSON.stringify({ clips }));
      req.end();
    });

    const clips = Array.from({length: 150000}, (_, i) => ({
      id: `clip-${i}`, assetId: 'test', trackId: 'V1', start: i, duration: 1
    }));

    await updateProject(sessionId, clips);

    const render = () => new Promise<string>((resolve) => {
      const req = http.request(`http://localhost:3333/session/${sessionId}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }, (res) => {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => resolve(data));
      });
      req.write(JSON.stringify({ preview: false }));
      req.end();
    });

    const response = await render();
    // It should fail with "No clips in timeline" or "No asset found" but not "Maximum call stack size exceeded"
    expect(response).not.toContain('Maximum call stack size exceeded');
  });
});
