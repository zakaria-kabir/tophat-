// TopHat+: Subprocess helper for persistent child processes (e.g., nvidia-smi)
// Ported and adapted from Vitals' helpers/subprocess.js by @corecoding

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

const decoder = new TextDecoder('utf-8');

export class SubProcess {
  private sub_process: Gio.Subprocess | null;
  private stdout: Gio.InputStream | null;

  constructor(command: string[]) {
    this.sub_process = Gio.Subprocess.new(
      command,
      Gio.SubprocessFlags.STDOUT_PIPE
    );
    this.stdout = this.sub_process.get_stdout_pipe();
  }

  public read(delimiter = ''): Promise<string | string[]> {
    return new Promise((resolve, reject) => {
      if (!this.stdout) {
        if (delimiter) resolve([]);
        else resolve('');
        return;
      }
      this.stdout.read_bytes_async(
        512,
        GLib.PRIORITY_LOW,
        null,
        (stdout, res) => {
          try {
            if (!stdout) {
              if (delimiter) resolve([]);
              else resolve('');
              return;
            }
            const readBytes = stdout.read_bytes_finish(res);
            if (!readBytes) {
              if (delimiter) resolve([]);
              else resolve('');
              return;
            }
            const data = readBytes.get_data();
            if (!data) {
              if (delimiter) resolve([]);
              else resolve('');
              return;
            }
            let readStr = decoder.decode(data).trim();
            if (delimiter) {
              const parts: string[] =
                readStr === '' ? [] : readStr.split(delimiter);
              resolve(parts);
            } else {
              resolve(readStr);
            }
          } catch (e: unknown) {
            // IOErrorEnum.PENDING means a previous read is still in flight — ignore it
            if (
              e instanceof GLib.Error &&
              e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.PENDING)
            ) {
              if (delimiter) resolve([]);
              else resolve('');
            } else {
              if (e instanceof Error) {
                reject(e.message);
              } else {
                reject(String(e));
              }
            }
          }
        }
      );
    });
  }

  public terminate(): void {
    try {
      const SIGINT = 2;
      this.sub_process?.send_signal(SIGINT);
    } catch (_e) {
      // already dead
    }
    this.sub_process = null;
    if (this.stdout) {
      this.stdout.close_async(GLib.PRIORITY_LOW, null, null);
      this.stdout = null;
    }
  }
}
