# Package-Search API

## Usage

The json-api allows for easy paginated queries like so:

`http://localhost:8788/?page=[INT]&size=[INT]&q=[STRING]`

The response contains matching `results` and `hasNext` if there is a next page.
