package server

import (
	"encoding/json"
	"net/http"
)

// Server represents our HTTP server and its dependencies
type Server struct {
	router *http.ServeMux
}

// NewServer creates and returns a new Server instance
func NewServer() *Server {
	s := &Server{
		router: http.NewServeMux(),
	}
	s.routes()
	return s
}

// routes sets up all the routes for our server
func (s *Server) routes() {
	s.router.HandleFunc("/ping", s.handlePing())
}

// Handler returns the HTTP handler for the server
func (s *Server) Handler() http.Handler {
	return s.router
}

// handlePing returns a handler for the /ping endpoint
func (s *Server) handlePing() http.HandlerFunc {
	type response struct {
		Status string `json:"status"`
	}

	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		resp := response{Status: "ok"}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}
}
