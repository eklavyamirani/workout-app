package main

import (
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"strings"
)

const (
	configPath   = "/usr/share/nginx/html/runtime-config.json"
	templatePath = "/etc/nginx/site.conf.template"
	outputPath   = "/tmp/nginx-site.conf"
)

type runtimeConfig struct {
	OIDCAuthority string `json:"oidcAuthority"`
}

func main() {
	if err := configure(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func configure() error {
	connectSrc := "'self'"

	data, err := os.ReadFile(configPath)
	if err == nil {
		var config runtimeConfig
		if err := json.Unmarshal(data, &config); err != nil {
			return fmt.Errorf("parse runtime config: %w", err)
		}
		if config.OIDCAuthority != "" {
			authority, err := url.Parse(config.OIDCAuthority)
			if err != nil || (authority.Scheme != "http" && authority.Scheme != "https") ||
				authority.Host == "" || authority.User != nil || authority.RawQuery != "" || authority.Fragment != "" {
				return fmt.Errorf("oidcAuthority must be a valid http or https URL")
			}
			connectSrc += " " + authority.Scheme + "://" + authority.Host
		}
	} else if !os.IsNotExist(err) {
		return fmt.Errorf("read runtime config: %w", err)
	}

	template, err := os.ReadFile(templatePath)
	if err != nil {
		return fmt.Errorf("read nginx template: %w", err)
	}
	config := strings.ReplaceAll(string(template), "__CONNECT_SRC__", connectSrc)
	if err := os.WriteFile(outputPath, []byte(config), 0o644); err != nil {
		return fmt.Errorf("write nginx config: %w", err)
	}
	return nil
}
