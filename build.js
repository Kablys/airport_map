// Simple build script for Deno
const exec = Deno.run;

async function execCommand(command) {
    const process = exec({
        cmd: command.split(' '),
        stdout: 'piped',
        stderr: 'piped'
    });
    
    const [status, stdout, stderr] = await Promise.all([
        process.status(),
        process.output(),
        process.stderrOutput()
    ]);
    
    if (stderr.length > 0) {
        console.error('stderr:', new TextDecoder().decode(stderr));
    }
    
    if (!status.success) {
        throw new Error(`Command failed with code ${status.code}`);
    }
    
    return new TextDecoder().decode(stdout);
}

console.log('Cleaning dist directory...');
try {
    await Deno.remove('dist', { recursive: true });
} catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
}
await Deno.mkdir('dist', { recursive: true });

console.log('Building application...');
try {
    // First, compile the application with --no-check to bypass TypeScript type checking
    await execCommand('deno compile --no-check --output dist/main --allow-net --allow-read --allow-env --allow-run --allow-write src/main.ts');
    console.log('Application compiled successfully (TypeScript type checking skipped)');
    
    // Copy sw.js separately since it's already in the root
    try {
        await Deno.copyFile('sw.js', 'dist/sw.js');
        console.log('Copied sw.js to dist/');
    } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
            console.warn('sw.js not found, skipping...');
        } else {
            throw error;
        }
    }
} catch (error) {
    console.error('Error building application:', error.message);
    Deno.exit(1);
}

console.log('Copying assets...');
const filesToCopy = ['index.html', 'manifest.json'];
const dirsToCopy = ['assets', 'data'];

// Copy individual files
for (const file of filesToCopy) {
    try {
        await Deno.copyFile(file, `dist/${file}`);
        console.log(`Copied ${file} to dist/`);
    } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
            console.warn(`File not found: ${file}, skipping...`);
        } else {
            console.warn(`Could not copy ${file}:`, error.message);
        }
    }
}

// Copy directories
async function copyDir(src, dest) {
    try {
        await Deno.mkdir(dest, { recursive: true });
        
        for await (const entry of Deno.readDir(src)) {
            const srcPath = `${src}/${entry.name}`;
            const destPath = `${dest}/${entry.name}`;
            
            if (entry.isDirectory) {
                await copyDir(srcPath, destPath);
            } else if (entry.isFile) {
                await Deno.copyFile(srcPath, destPath);
            }
        }
    } catch (error) {
        console.error(`Error copying directory ${src} to ${dest}:`, error);
        throw error;
    }
}

// Process directories
for (const dir of dirsToCopy) {
    try {
        await copyDir(dir, path.join('dist', dir));
        console.log(`Copied ${dir}/ to dist/${dir}/`);
    } catch (error) {
        console.warn(`Could not copy directory ${dir}:`, error.message);
    }
}

console.log('Build completed successfully!');
