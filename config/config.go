package config

import "github.com/spf13/viper"

type Config struct {
	// The path to the log file. If empty, logging is disabled.
	LogFilePath string `env:"FREMORIZER_LOG"`
}

func Load() (*Config, error) {
	viper.SetEnvPrefix("FREMORIZER")
	viper.AutomaticEnv()

	return &Config{
		LogFilePath: viper.GetString("LOG"),
	}, nil
}
