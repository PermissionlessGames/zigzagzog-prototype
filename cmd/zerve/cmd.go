package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/spf13/cobra"

	"github.com/PermissionlessGames/zigzagzog-prototype/pkg/server"
	"github.com/PermissionlessGames/zigzagzog-prototype/version"
)

func CreateRootCommand() *cobra.Command {
	var (
		host string
		port int
	)

	rootCmd := &cobra.Command{
		Use:   "zerve",
		Short: "zerve: HTTP server for ZigZagZog",
		RunE: func(cmd *cobra.Command, args []string) error {
			srv := server.NewServer()
			addr := fmt.Sprintf("%s:%d", host, port)

			log.Printf("Starting server on %s", addr)
			if err := http.ListenAndServe(addr, srv.Handler()); err != nil {
				return fmt.Errorf("server error: %v", err)
			}
			return nil
		},
	}

	rootCmd.Flags().StringVarP(&host, "host", "H", "0.0.0.0", "Host interface to bind to")
	rootCmd.Flags().IntVarP(&port, "port", "p", 2397, "Port to listen on")

	completionCmd := CreateCompletionCommand(rootCmd)
	versionCmd := CreateVersionCommand()

	rootCmd.AddCommand(completionCmd, versionCmd)
	rootCmd.SetOut(os.Stdout)

	return rootCmd
}

func CreateCompletionCommand(rootCmd *cobra.Command) *cobra.Command {
	completionCmd := &cobra.Command{
		Use:   "completion",
		Short: "Generate shell completion scripts for zerve",
		Long: `Generate shell completion scripts for zerve.

The command for each shell will print a completion script to stdout. You can source this script to get
completions in your current shell session. You can add this script to the completion directory for your
shell to get completions for all future sessions.

For example, to activate bash completions in your current shell:
		$ . <(zerve completion bash)

To add zerve completions for all bash sessions:
		$ zerve completion bash > /etc/bash_completion.d/zerve_completions`,
	}

	bashCompletionCmd := &cobra.Command{
		Use:   "bash",
		Short: "bash completions for zerve",
		Run: func(cmd *cobra.Command, args []string) {
			rootCmd.GenBashCompletion(cmd.OutOrStdout())
		},
	}

	zshCompletionCmd := &cobra.Command{
		Use:   "zsh",
		Short: "zsh completions for zerve",
		Run: func(cmd *cobra.Command, args []string) {
			rootCmd.GenZshCompletion(cmd.OutOrStdout())
		},
	}

	fishCompletionCmd := &cobra.Command{
		Use:   "fish",
		Short: "fish completions for zerve",
		Run: func(cmd *cobra.Command, args []string) {
			rootCmd.GenFishCompletion(cmd.OutOrStdout(), true)
		},
	}

	powershellCompletionCmd := &cobra.Command{
		Use:   "powershell",
		Short: "powershell completions for zerve",
		Run: func(cmd *cobra.Command, args []string) {
			rootCmd.GenPowerShellCompletion(cmd.OutOrStdout())
		},
	}

	completionCmd.AddCommand(bashCompletionCmd, zshCompletionCmd, fishCompletionCmd, powershellCompletionCmd)

	return completionCmd
}

func CreateVersionCommand() *cobra.Command {
	versionCmd := &cobra.Command{
		Use:   "version",
		Short: "Print the version of zerve that you are currently using",
		Run: func(cmd *cobra.Command, args []string) {
			cmd.Println(version.ZigZagZogVersion)
		},
	}

	return versionCmd
}
