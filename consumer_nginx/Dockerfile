FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf

COPY consumer_nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
