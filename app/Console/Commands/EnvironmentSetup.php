<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class EnvironmentSetup extends Command
{
    protected $signature = 'environment:setup
                            {--url= : The application URL}
                            {--db-connection=sqlite : The database driver (sqlite or mysql)}
                            {--db-host=127.0.0.1 : The database host}
                            {--db-port=3306 : The database port}
                            {--db-database= : The database name}
                            {--db-username= : The database username}
                            {--db-password= : The database password}
                            {--cache=database : The cache driver}
                            {--queue=database : The queue driver}
                            {--session=database : The session driver}';

    protected $description = 'Configure the environment file for production';

    public function handle(): int
    {
        $envPath = base_path('.env');

        if (! file_exists($envPath)) {
            copy(base_path('.env.example'), $envPath);
            $this->info('Created .env from .env.example.');
        }

        $replacements = [
            'APP_ENV' => 'production',
            'APP_DEBUG' => 'false',
            'APP_URL' => $this->option('url') ?? 'http://localhost',
            'DB_CONNECTION' => $this->option('db-connection'),
            'CACHE_STORE' => $this->option('cache'),
            'QUEUE_CONNECTION' => $this->option('queue'),
            'SESSION_DRIVER' => $this->option('session'),
        ];

        if ($this->option('db-connection') === 'mysql') {
            $replacements['DB_HOST'] = $this->option('db-host');
            $replacements['DB_PORT'] = $this->option('db-port');
            $replacements['DB_DATABASE'] = $this->option('db-database') ?? 'skyport';
            $replacements['DB_USERNAME'] = $this->option('db-username') ?? 'skyport';
            $replacements['DB_PASSWORD'] = $this->option('db-password') ?? '';
        }

        $contents = file_get_contents($envPath);

        foreach ($replacements as $key => $value) {
            // Match both commented and uncommented lines
            $pattern = "/^#?\s*{$key}=.*/m";

            if (preg_match($pattern, $contents)) {
                $contents = preg_replace($pattern, "{$key}={$value}", $contents, 1);
            } else {
                $contents = rtrim($contents)."\n{$key}={$value}\n";
            }
        }

        file_put_contents($envPath, $contents);

        $this->info('Environment configured for production.');

        return self::SUCCESS;
    }
}
